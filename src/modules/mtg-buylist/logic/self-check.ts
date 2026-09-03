import { allocate, withAllocateResults } from "./allocate";
import { parseManaBoxCsv, majorityPurchaseCurrency } from "./parse-csv";
import { parseMateJson } from "./parse-mate";
import { parsePlaymantisHtml, resolveOffersForScryfallId } from "./playmantis";
import { csvJoinKeys, mateCollectorFromName, normalizeCardName } from "./names";
import { emptyMtgBuylistStore } from "../schema";
import {
  buildCompareRows,
  buildMateStreamRows,
  buildPmStreamRows,
  recoveredPercent,
  recoveryBand,
} from "./tables";
import {
  findMate,
  indexMateOffers,
  listMateVariants,
  manaBoxRowKey,
  resolveMateOffer,
} from "./allocate";
import type { MateOffer } from "../schema";

const TINY_CSV = `Name,Set code,Set name,Collector number,Foil,Rarity,Quantity,ManaBox ID,Scryfall ID,Purchase price,Misprint,Altered,Condition,Language,Purchase price currency,Added
Ageless Entity,DDH,Duel Decks: Ajani vs. Nicol Bolas,18,normal,rare,1,18974,a4f9d79a-dff5-46e1-b767-30a451b54942,0.68,false,false,near_mint,en,AUD,2026-09-02T23:42:47.831Z
Searing Meditation,DDH,Duel Decks: Ajani vs. Nicol Bolas,27,normal,rare,1,18965,6f5e0200-21c9-4926-b238-3f9b1f5fc6ed,0.68,false,false,near_mint,en,AUD,2026-09-02T23:42:47.837Z
Forest,DDH,Duel Decks: Ajani vs. Nicol Bolas,38,normal,common,1,1,aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee,0.02,false,false,near_mint,en,AUD,2026-09-02T23:42:47.000Z
Dragon,DMU,Dominaria United,1,foil,rare,1,2,bbbbbbbb-cccc-dddd-eeee-ffffffffffff,1.00,false,false,near_mint,en,AUD,2026-09-02T23:42:47.000Z
Pain,DDH,Duel Decks: Ajani vs. Nicol Bolas,65,normal,uncommon,1,3,cccccccc-dddd-eeee-ffff-111111111111,0.20,false,false,near_mint,en,AUD,2026-09-02T23:42:47.000Z
Unknown Card,XYZ,Fake Set,99,normal,rare,1,4,dddddddd-eeee-ffff-1111-222222222222,1.00,false,false,near_mint,en,AUD,2026-09-02T23:42:47.000Z
Armor Wars,MSH,Marvel Super Heroes,203,normal,rare,1,5,11a13397-1d31-4257-87c2-a757a751c601,0.28,false,false,near_mint,en,AUD,2026-09-03T00:00:00.000Z
`;

const TINY_MATE = JSON.stringify({
  title: "Tiny Mate fixture",
  uuid_data: {
    "9a1671ce-b89d-5105-aa8c-7cf051fb2803": {
      uuid: "9a1671ce-b89d-5105-aa8c-7cf051fb2803",
      name: "Ageless Entity",
      buy_price: 50,
      credit_price: 63,
      set_code: "ddh",
      quantity: 4,
      finish: "Nonfoil",
    },
    "f70452a1-164f-5158-bf45-e2ba1b36c213": {
      uuid: "f70452a1-164f-5158-bf45-e2ba1b36c213",
      name: "Searing Meditation",
      buy_price: 20,
      credit_price: 25,
      set_code: "ddh",
      quantity: 0,
      finish: "Nonfoil",
    },
    "d55bdf4e-5dfd-5f7f-ad05-9ab560272acc": {
      uuid: "d55bdf4e-5dfd-5f7f-ad05-9ab560272acc",
      name: "Forest (38)",
      buy_price: 2,
      credit_price: 3,
      set_code: "ddh",
      quantity: 4,
      finish: "Nonfoil",
    },
    "aaaaaaaa-1111-2222-3333-444444444444": {
      uuid: "aaaaaaaa-1111-2222-3333-444444444444",
      name: "Dragon Showcase Foil",
      buy_price: 400,
      credit_price: 500,
      set_code: "dmu",
      quantity: 2,
      finish: "Foil",
    },
    "745696ae-75b4-5564-a849-b23a5e6a1223": {
      uuid: "745696ae-75b4-5564-a849-b23a5e6a1223",
      name: "Pain // Suffering",
      buy_price: 20,
      credit_price: 25,
      set_code: "ddh",
      quantity: 4,
      finish: "Nonfoil",
    },
  },
});

const TINY_PM = `<div class="buylist-grid" id="buylist-grid-container">
  <div class="buylist-card" data-product-id="1" data-title="ageless entity" data-scryfall-id="a4f9d79a-dff5-46e1-b767-30a451b54942">
    <select class="finish-dropdown">
      <option value="1" data-variant-title="Nonfoil" data-credit-price="0.40" data-buylist-limit="4">Nonfoil</option>
    </select>
  </div>
  <div class="buylist-card" data-product-id="2" data-title="searing meditation" data-scryfall-id="6f5e0200-21c9-4926-b238-3f9b1f5fc6ed">
    <select class="finish-dropdown">
      <option value="2" data-variant-title="Nonfoil" data-credit-price="1.00" data-buylist-limit="4">Nonfoil</option>
    </select>
  </div>
</div>`;

const SEARCH_PM = `<div class="buylist-grid" id="buylist-grid-container">
  <div class="buylist-card" data-product-id="8253517725740" data-title="ageless entity">
    <img src="//playmantis.com.au/cdn/shop/files/a4f9d79a-dff5-46e1-b767-30a451b54942.jpg">
    <select class="finish-dropdown">
      <option value="1" data-variant-title="Nonfoil" data-credit-price="0.40">Nonfoil</option>
    </select>
  </div>
</div>`;

/** Playmantis search view shape for Armor Wars — credit present, no data-buylist-limit. */
const ARMOR_WARS_SEARCH_PM = `<div class="buylist-grid" id="buylist-grid-container">
  <div class="buylist-card" data-product-id="8321891729452" data-title="armor wars">
    <img src="//playmantis.com.au/cdn/shop/files/11a13397-1d31-4257-87c2-a757a751c601.jpg?v=1781069475&width=240">
    <select class="finish-dropdown">
      <option value="45628865904684" data-variant-title="Nonfoil" data-credit-price="0.5" data-inventory="4">Nonfoil</option>
      <option value="45628865937452" data-variant-title="Foil" data-credit-price="0.5" data-inventory="1">Foil</option>
    </select>
  </div>
</div>`;

export function runParserSelfCheck(): { ok: boolean; messages: string[] } {
  const messages: string[] = [];
  const csv = parseManaBoxCsv(TINY_CSV);
  const mate = parseMateJson(TINY_MATE);
  const pm = parsePlaymantisHtml(TINY_PM, "2026-09-03T00:00:00.000Z");
  const searchPm = parsePlaymantisHtml(
    SEARCH_PM,
    "2026-09-03T00:00:00.000Z",
    "a4f9d79a-dff5-46e1-b767-30a451b54942",
  );
  if (
    searchPm.length !== 1 ||
    searchPm[0].scryfallId !== "a4f9d79a-dff5-46e1-b767-30a451b54942" ||
    searchPm[0].creditCents !== 40 ||
    searchPm[0].limit !== 4
  ) {
    messages.push("Search HTML without data-scryfall-id should still parse credit and default limit 4");
  }

  const armorHtml = parsePlaymantisHtml(
    ARMOR_WARS_SEARCH_PM,
    "2026-09-03T00:00:00.000Z",
    "11a13397-1d31-4257-87c2-a757a751c601",
  );
  const armorNonfoil = armorHtml.find(
    (o) =>
      o.scryfallId.toLowerCase() === "11a13397-1d31-4257-87c2-a757a751c601" &&
      o.finish.toLowerCase() === "nonfoil" &&
      !o.missing,
  );
  if (!armorNonfoil || armorNonfoil.creditCents !== 50 || armorNonfoil.limit !== 4) {
    messages.push("Armor Wars search HTML should parse $0.50 credit and default want limit 4");
  }

  const mismatchedUuidHtml = `<div class="buylist-grid">
  <div class="buylist-card" data-product-id="1" data-title="armor wars">
    <img src="//playmantis.com.au/cdn/shop/files/ffffffff-ffff-ffff-ffff-ffffffffffff.jpg">
    <select class="finish-dropdown">
      <option data-variant-title="Nonfoil" data-credit-price="0.5">Nonfoil</option>
    </select>
  </div>
</div>`;
  const rebound = resolveOffersForScryfallId(
    parsePlaymantisHtml(mismatchedUuidHtml, "2026-09-03T00:00:00.000Z"),
    "11a13397-1d31-4257-87c2-a757a751c601",
    "Armor Wars",
  );
  if (
    rebound.length !== 1 ||
    rebound[0].scryfallId !== "11a13397-1d31-4257-87c2-a757a751c601" ||
    rebound[0].missing
  ) {
    messages.push("Image UUID ≠ CSV Scryfall ID should still bind to the CSV id (false not-found)");
  }
  if (normalizeCardName("Armor Wars (Showcase - Panel)").name !== "armor wars") {
    messages.push("Showcase - Panel parenthetical should strip for title match");
  }

  const ageless = csv.find((r) => r.name === "Ageless Entity");
  const searing = csv.find((r) => r.name === "Searing Meditation");
  const forest = csv.find((r) => r.name === "Forest");
  const dragon = csv.find((r) => r.name === "Dragon");
  const pain = csv.find((r) => r.name === "Pain");
  const unknown = csv.find((r) => r.name === "Unknown Card");
  const armor = csv.find((r) => r.name === "Armor Wars");
  if (!ageless || !searing || !forest || !dragon || !pain || !unknown || !armor) {
    return { ok: false, messages: ["Fixture CSV rows missing"] };
  }

  if (ageless.purchasePriceCents !== 68 || ageless.purchaseCurrency !== "AUD") {
    messages.push("Ageless Entity should parse Purchase price 0.68 AUD as 68 cents");
  }
  const listedBasis = majorityPurchaseCurrency(csv);
  if (listedBasis.currency !== "AUD" || listedBasis.missing) {
    messages.push("Fixture CSV majority currency should be AUD");
  }

  if (mate.offers.find((o) => o.name === "Ageless Entity")?.creditPriceCents !== 63) {
    messages.push("Mate Ageless credit should be 63 cents");
  }
  if (normalizeCardName("Forest (38)").collectorNumber !== "38") {
    messages.push("Collector suffix should strip to 38");
  }
  if (normalizeCardName("Pain // Suffering").name !== "pain") {
    messages.push("Split cards should use the front face");
  }
  if (normalizeCardName("Dragon Showcase Foil").name !== "dragon") {
    messages.push("Showcase/foil suffixes should strip");
  }

  const dragonKeys = csvJoinKeys(dragon);
  if (!dragonKeys.some((k) => k.includes("dmu|dragon|foil"))) {
    messages.push("CSV foil dragon should join Mate showcase foil after strip");
  }

  const result = allocate({
    rows: csv,
    mateOffers: mate.offers,
    playmantisOffers: pm,
  });

  const mateLine = result.buckets.mate.find((l) => l.name === "Ageless Entity");
  if (!mateLine || mateLine.quantity !== 1) {
    messages.push("Ageless Entity should sell to Mate (credit 63 > PM 40)");
  }
  const agelessMateRows = buildMateStreamRows([ageless], mate.offers);
  if (
    agelessMateRows[0]?.listedCents !== 68 ||
    recoveredPercent(agelessMateRows[0]?.creditCents ?? 0, 68) !== 93
  ) {
    messages.push("Ageless Mate recovered % should be 93 (63c credit of 68c listed)");
  }
  const searingPm = result.buckets.playmantis.find((l) => l.name === "Searing Meditation");
  if (!searingPm || searingPm.quantity !== 1) {
    messages.push("Searing Meditation Mate cap 0 but PM wants it — Sell Playmantis");
  }
  const forestMate = result.buckets.mate.find((l) => l.name === "Forest");
  if (!forestMate) messages.push("Forest (38) should join Mate on collector number");
  const unknownLine = result.buckets.unmatched.find((l) => l.name === "Unknown Card");
  if (!unknownLine) messages.push("Unknown Card should be Unmatched");
  const painMate = result.buckets.mate.find((l) => l.name === "Pain");
  if (!painMate) messages.push("Pain should join Mate Pain // Suffering on front face");

  const pmOnly = allocate({
    rows: [armor],
    mateOffers: [],
    playmantisOffers: armorHtml,
  });
  const armorSell = pmOnly.buckets.playmantis.find((l) => l.name === "Armor Wars");
  if (!armorSell || armorSell.quantity !== 1) {
    messages.push("Armor Wars PM-only allocate should Sell Playmantis, not Unmatched");
  }
  if (pmOnly.buckets.unmatched.some((l) => l.name === "Armor Wars")) {
    messages.push("Armor Wars must not land in Unmatched when Playmantis shows credit");
  }

  const streamsPmOnly = withAllocateResults({
    ...emptyMtgBuylistStore(),
    csv: { filename: "t.csv", uploadedAt: "2026-09-03T00:00:00.000Z", rows: csv },
    playmantis: { fetchedAt: "2026-09-03T00:00:00.000Z", offers: pm },
    mate: null,
  });
  if (!streamsPmOnly.resultPm || streamsPmOnly.resultCompare) {
    messages.push("Compare must stay empty until more than one store allocate is completed");
  }

  const streamsBoth = withAllocateResults({
    ...streamsPmOnly,
    mate: {
      harvestedAt: "2026-09-03T00:00:00.000Z",
      source: "upload",
      sets: mate.sets,
      offers: mate.offers,
    },
  });
  if (!streamsBoth.resultPm || !streamsBoth.resultMate || !streamsBoth.resultCompare) {
    messages.push("Compare should activate when PM and Mate allocates both exist");
  }

  const streamRows = buildPmStreamRows([armor], armorHtml);
  if (
    streamRows.length !== 1 ||
    streamRows[0].have !== 1 ||
    streamRows[0].wanted !== 4 ||
    streamRows[0].sell !== 1 ||
    streamRows[0].tone !== "sell"
  ) {
    messages.push("PM stream row should show have/wanted/sell for Armor Wars");
  }

  const ambiguousEagles: MateOffer[] = [
    {
      mateUuid: "a",
      name: "The Lord of the Eagles",
      setCode: "hob",
      finish: "Nonfoil",
      buyPriceCents: 500,
      creditPriceCents: 625,
      quantity: 31,
      normalisedName: "the lord of the eagles",
      collectorNumber: "",
      imageUrl: "https://example.com/expensive",
      rarity: "rare",
    },
    {
      mateUuid: "b",
      name: "The Lord of the Eagles",
      setCode: "hob",
      finish: "Nonfoil",
      buyPriceCents: 20,
      creditPriceCents: 25,
      quantity: 0,
      normalisedName: "the lord of the eagles",
      collectorNumber: "",
      imageUrl: "https://example.com/cheap",
      rarity: "rare",
    },
  ];
  const eagleRow = {
    name: "The Lord of the Eagles",
    setCode: "HOB",
    setName: "The Hobbit",
    collectorNumber: "46",
    foil: "normal",
    quantity: 1,
    scryfallId: "fa0554fc-9448-4ae2-8712-4f4f7af3c7b4",
    rarity: "rare",
  };
  if (findMate(eagleRow, indexMateOffers(ambiguousEagles))) {
    messages.push("Ambiguous Mate printings (same name/finish, different image) must not auto-join");
  }
  const eagleStream = buildMateStreamRows([eagleRow], ambiguousEagles);
  if (
    !eagleStream[0]?.ambiguous ||
    eagleStream[0].variants.length !== 2 ||
    eagleStream[0].variants[0].wanted !== 31 ||
    eagleStream[0].variants[0].sell !== 1 ||
    eagleStream[0].variants[1].wanted !== 0 ||
    eagleStream[0].variants[1].sell !== 0
  ) {
    messages.push(
      "Ambiguous Mate stream should list every printing with wanted qty and fulfilable sell qty",
    );
  }
  const eagleCompare = buildCompareRows([eagleRow], ambiguousEagles, []);
  if (!eagleCompare[0]?.putAside || eagleCompare[0].listedMateCreditCents < 625) {
    messages.push("Ambiguous money Mate listing should put aside for future value at $6.25 listed");
  }
  if (
    !eagleCompare[0]?.mateAmbiguous ||
    eagleCompare[0].mateSell !== 0 ||
    !eagleCompare[0].showVariants ||
    eagleCompare[0].wantFull
  ) {
    messages.push(
      "Ambiguous Mate compare should warn (Confirm in Mate stream) and not auto-allocate or call it want-full",
    );
  }
  const eagleKey = manaBoxRowKey(eagleRow);
  const eagleConfirmed = resolveMateOffer(
    eagleRow,
    indexMateOffers(ambiguousEagles),
    ambiguousEagles,
    { [eagleKey]: "a" },
  );
  if (!eagleConfirmed.offer || eagleConfirmed.offer.mateUuid !== "a" || eagleConfirmed.ambiguous) {
    messages.push("Confirming a Mate variant should resolve the ambiguous printing");
  }
  const eagleConfirmedCompare = buildCompareRows(
    [eagleRow],
    ambiguousEagles,
    [],
    { [eagleKey]: "a" },
  );
  if (
    eagleConfirmedCompare[0]?.mateAmbiguous ||
    eagleConfirmedCompare[0]?.mateSell !== 1 ||
    eagleConfirmedCompare[0]?.confirmedMateUuid !== "a" ||
    eagleConfirmedCompare[0]?.showVariants ||
    eagleConfirmedCompare[0]?.mateVariants.length
  ) {
    messages.push(
      "Confirmed Mate printing should allocate sell qty, clear ambiguous, and collapse Compare to one row",
    );
  }

  const unwantedOnly: MateOffer[] = ambiguousEagles.map((o) => ({
    ...o,
    quantity: 0,
    creditPriceCents: o.mateUuid === "a" ? 625 : 25,
  }));
  const unwantedResolved = resolveMateOffer(
    eagleRow,
    indexMateOffers(unwantedOnly),
    unwantedOnly,
  );
  if (unwantedResolved.needsConfirm || unwantedResolved.ambiguous) {
    messages.push("When no Mate variant is wanted, Confirm should not be required");
  }

  const eaOffers: MateOffer[] = [
    {
      mateUuid: "base",
      name: "Heroic Return",
      setCode: "msc",
      finish: "Nonfoil",
      buyPriceCents: 20,
      creditPriceCents: 25,
      quantity: 4,
      normalisedName: "heroic return",
      collectorNumber: "",
      imageUrl: "https://example.com/base",
      rarity: "rare",
    },
    {
      mateUuid: "ea",
      name: "Heroic Return (Extended Art)",
      setCode: "msc",
      finish: "Nonfoil",
      buyPriceCents: 100,
      creditPriceCents: 125,
      quantity: 4,
      normalisedName: "heroic return",
      collectorNumber: "",
      imageUrl: "https://example.com/ea",
      rarity: "rare",
    },
  ];
  const eaRow = {
    name: "Heroic Return",
    setCode: "MSC",
    setName: "Marvel Super Heroes",
    collectorNumber: "309",
    foil: "normal",
    quantity: 1,
    scryfallId: "eeeeeeee-1111-2222-3333-444444444444",
    rarity: "rare",
    frameEffects: ["extendedart"],
  };
  const eaVariants = listMateVariants(eaRow, eaOffers);
  if (eaVariants.length !== 1 || eaVariants[0].mateUuid !== "ea") {
    messages.push("Scryfall extendedart should prefer Mate '(Extended Art)' printing");
  }
  const eaResolved = resolveMateOffer(eaRow, indexMateOffers(eaOffers), eaOffers);
  if (eaResolved.needsConfirm || eaResolved.offer?.mateUuid !== "ea") {
    messages.push("Treatment match should auto-resolve without Confirm");
  }

  if (recoveryBand(120, 100) !== "excellent") {
    messages.push("Recovered >100% should be excellent (strong green)");
  }
  if (recoveryBand(80, 100) !== "good" || recoveryBand(70, 100) !== "ok") {
    messages.push("Recovered ≥80% good and ≥70% ok bands should hold");
  }
  if (recoveryBand(50, 100) !== "ok") {
    messages.push("Under $2 listed with ≥50¢ offer should count as ok");
  }

  // Exact image link → owned Scryfall id auto-resolves bare-name ambiguities.
  const eaglesImageResolved = resolveMateOffer(
    eagleRow,
    indexMateOffers(ambiguousEagles),
    ambiguousEagles,
    {
      imageLinks: {
        a: eagleRow.scryfallId,
        b: "11111111-2222-3333-4444-555555555555",
      },
    },
  );
  if (
    eaglesImageResolved.needsConfirm ||
    eaglesImageResolved.offer?.mateUuid !== "a" ||
    !eaglesImageResolved.canReject
  ) {
    messages.push(
      "Exact Mate image→Scryfall link should auto-resolve and allow Wrong printing reject",
    );
  }
  const eaglesRejected = resolveMateOffer(
    eagleRow,
    indexMateOffers(ambiguousEagles),
    ambiguousEagles,
    {
      imageLinks: { a: eagleRow.scryfallId },
      reconfirm: { [eagleKey]: true },
    },
  );
  if (!eaglesRejected.needsConfirm || eaglesRejected.offer) {
    messages.push("Wrong printing reconfirm should resurface Confirm and clear the auto offer");
  }

  if (mateCollectorFromName("Bard's Company (Borderless 210)") !== "210") {
    messages.push("Mate collector should parse from (Borderless N) titles");
  }

  const compareAll = buildCompareRows(csv, mate.offers, pm);
  if (compareAll.length !== csv.length) {
    messages.push("Compare must list every CSV card, including not found and want-full");
  }
  const unknownCompare = compareAll.find((r) => r.name === "Unknown Card");
  if (!unknownCompare?.notFound) {
    messages.push("Unknown Card should appear on Compare as not found");
  }
  const searingCompare = compareAll.find((r) => r.name === "Searing Meditation");
  if (!searingCompare || searingCompare.mateWanted !== 0) {
    messages.push("Searing Meditation Mate want-full should still appear on Compare");
  }

  return { ok: messages.length === 0, messages };
}
