import { allocate, withAllocateResults } from "./allocate";
import { parseManaBoxCsv, majorityPurchaseCurrency } from "./parse-csv";
import { parseMateJson, filterMateOffersForCsv } from "./parse-mate";
import {
  classifyBuylistSearchHtml,
  parsePlaymantisHtml,
  resolveOffersForScryfallId,
  scryfallIdsNeedingPlaymantisFetch,
} from "./playmantis";
import { csvJoinKeys, mateCollectorFromName, normalizeCardName } from "./names";
import { emptyMtgBuylistStore } from "../schema";
import {
  buildCompareRows,
  buildMateStreamRows,
  buildPmStreamRows,
  manaBoxPackingCsv,
  recoveredPercent,
  recoveryBand,
} from "./tables";
import { parseSubmissionCsv, subtractSoldFromManaBox } from "./reprepare";
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
  const ddhOnly = filterMateOffersForCsv(mate.offers, ["ddh"]);
  if (!ddhOnly.length || ddhOnly.some((o) => o.setCode.toLowerCase() !== "ddh")) {
    messages.push("Mate harvest upload should keep only cards in the CSV sets");
  }
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
  if (classifyBuylistSearchHtml(SEARCH_PM) !== "hit") {
    messages.push("Search HTML with a buylist-card should classify as hit");
  }
  if (
    classifyBuylistSearchHtml(
      `<div id="buylist-grid-container"></div><div id="buylist-pagination"></div>`,
    ) !== "empty"
  ) {
    messages.push("Buylist grid with no cards should classify as empty");
  }
  if (classifyBuylistSearchHtml("<html><body>Just a moment</body></html>") !== "blocked") {
    messages.push("Challenge HTML without a buylist grid should classify as blocked");
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
  if (!armorNonfoil || armorNonfoil.creditCents !== 50 || armorNonfoil.limit !== 0) {
    messages.push("Armor Wars nonfoil inventory 4 should parse remaining want 0 (4 − stock)");
  }

  const multilineInvHtml = `<div class="buylist-grid" id="buylist-grid-container">
      <div class="buylist-card" 
           data-product-id="1"
           data-title="dearly departed"
           data-colors=""
           data-type="">
        <p class="card-set">Innistrad</p>
        <select class="finish-dropdown">
                <option value="1" 
                        data-variant-title="Nonfoil" 
                        data-credit-price="0.5"
                        data-inventory="4">
                  Nonfoil
                </option>
                <option value="2" 
                        data-variant-title="Foil" 
                        data-credit-price="0.5"
                        data-inventory="0">
                  Foil
                </option>
        </select>
      </div>
</div>`;
  const multilinePm = parsePlaymantisHtml(
    multilineInvHtml,
    "2026-09-03T00:00:00.000Z",
    "d008061f-cda4-4bcf-b6b3-d1b4a251cc66",
  );
  const multilineNonfoil = multilinePm.find((o) => o.finish.toLowerCase() === "nonfoil" && !o.missing);
  if (!multilineNonfoil || multilineNonfoil.limit !== 0) {
    messages.push("Multiline option tags with data-inventory=4 should parse remaining want 0");
  }

  const mismatchedUuidHtml = `<div class="buylist-grid">
  <div class="buylist-card" data-product-id="1" data-title="armor wars">
    <img src="//playmantis.com.au/cdn/shop/files/ffffffff-ffff-ffff-ffff-ffffffffffff.jpg">
    <select class="finish-dropdown">
      <option data-variant-title="Nonfoil" data-credit-price="0.5">Nonfoil</option>
    </select>
  </div>
</div>`;
  const reboundNameOnly = resolveOffersForScryfallId(
    parsePlaymantisHtml(mismatchedUuidHtml, "2026-09-03T00:00:00.000Z"),
    "11a13397-1d31-4257-87c2-a757a751c601",
    "Armor Wars",
  );
  if (
    reboundNameOnly.length !== 1 ||
    reboundNameOnly[0].scryfallId !== "11a13397-1d31-4257-87c2-a757a751c601" ||
    reboundNameOnly[0].creditCents !== 50
  ) {
    messages.push("Name search should bind Armor Wars by title when search HTML has no data-scryfall-id");
  }
  const reboundUuidTag = resolveOffersForScryfallId(
    parsePlaymantisHtml(mismatchedUuidHtml, "2026-09-03T00:00:00.000Z"),
    "11a13397-1d31-4257-87c2-a757a751c601",
    "Armor Wars",
    { uuidTag: true },
  );
  if (
    reboundUuidTag.length !== 1 ||
    reboundUuidTag[0].scryfallId !== "11a13397-1d31-4257-87c2-a757a751c601" ||
    reboundUuidTag[0].creditCents !== 50
  ) {
    messages.push("UUID-tag search should take the tagged product even when image UUID differs");
  }

  const fieldOfSoulsCsvId = "aaaaaaaa-1111-2222-3333-444444444444";
  const fieldOfSoulsOtherSet = `<div class="buylist-grid">
  <div class="buylist-card" data-product-id="2" data-title="field of souls">
    <img src="//playmantis.com.au/cdn/shop/files/bbbbbbbb-1111-2222-3333-444444444444.jpg">
    <p class="card-set">Tempest</p>
    <select class="finish-dropdown">
      <option data-variant-title="Nonfoil" data-credit-price="0.80">Nonfoil</option>
    </select>
  </div>
</div>`;
  const fieldBound = resolveOffersForScryfallId(
    parsePlaymantisHtml(fieldOfSoulsOtherSet, "2026-09-03T00:00:00.000Z"),
    fieldOfSoulsCsvId,
    "Field of Souls",
  );
  if (
    fieldBound.length !== 1 ||
    fieldBound[0].scryfallId !== fieldOfSoulsCsvId ||
    fieldBound[0].creditCents !== 80
  ) {
    messages.push("Field of Souls reprint should bind on title when UUID-tag page was empty");
  }

  const blazingCsvId = "cccccccc-1111-2222-3333-444444444444";
  const blazingOtherSet = `<div class="buylist-grid">
  <div class="buylist-card" data-product-id="3" data-title="blazing specter">
    <img src="//playmantis.com.au/cdn/shop/files/dddddddd-1111-2222-3333-444444444444.jpg">
    <p class="card-set">Invasion</p>
    <select class="finish-dropdown">
      <option data-variant-title="Nonfoil" data-credit-price="1.20">Nonfoil</option>
    </select>
  </div>
</div>`;
  const blazingBound = resolveOffersForScryfallId(
    parsePlaymantisHtml(blazingOtherSet, "2026-09-03T00:00:00.000Z"),
    blazingCsvId,
    "Blazing Specter",
  );
  if (
    blazingBound.length !== 1 ||
    blazingBound[0].scryfallId !== blazingCsvId ||
    blazingBound[0].creditCents !== 120
  ) {
    messages.push("Blazing Specter reprint should bind on title when UUID-tag page was empty");
  }

  const lightningCsvId = "eeeeeeee-1111-2222-3333-444444444444";
  const lightningSameSet = `<div class="buylist-grid">
  <div class="buylist-card" data-product-id="4" data-title="lightning reaver">
    <img src="//playmantis.com.au/cdn/shop/files/ffffffff-1111-2222-3333-444444444444.jpg">
    <p class="card-set">Alara Reborn</p>
    <select class="finish-dropdown">
      <option data-variant-title="Nonfoil" data-credit-price="2.50">Nonfoil</option>
    </select>
  </div>
</div>`;
  const lightningBound = resolveOffersForScryfallId(
    parsePlaymantisHtml(lightningSameSet, "2026-09-03T00:00:00.000Z"),
    lightningCsvId,
    "Lightning Reaver",
    { uuidTag: true },
  );
  if (
    lightningBound.length !== 1 ||
    lightningBound[0].scryfallId !== lightningCsvId ||
    lightningBound[0].creditCents !== 250
  ) {
    messages.push("UUID-tag first product should bind even when image UUID differs");
  }

  const searingId = "6f5e0200-21c9-4926-b238-3f9b1f5fc6ed";
  const mindBendHtml = `<div class="buylist-grid">
  <div class="buylist-card" data-product-id="9" data-title="mind bend">
    <img src="//playmantis.com.au/cdn/shop/files/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee.jpg">
    <select class="finish-dropdown">
      <option data-variant-title="Nonfoil" data-credit-price="0.40">Nonfoil</option>
    </select>
  </div>
</div>`;
  const mindBendBound = resolveOffersForScryfallId(
    parsePlaymantisHtml(mindBendHtml, "2026-09-03T00:00:00.000Z", searingId, "Searing Meditation"),
    searingId,
    "Searing Meditation",
  );
  if (mindBendBound.length) {
    messages.push("Mind Bend HTML must not bind to Searing Meditation even with UUID fallback");
  }
  const searingFuzzyHtml = `<div class="buylist-grid">
  <div class="buylist-card" data-product-id="1" data-title="brass&#39;s tunnel-grinder // tecutlan, the searing rift">
    <img src="//playmantis.com.au/cdn/shop/files/aaaaaaaa-bbbb-cccc-dddd-111111111111.jpg">
    <p class="card-set">The Lost Caverns of Ixalan</p>
    <select class="finish-dropdown">
      <option data-variant-title="Nonfoil" data-credit-price="0.40">Nonfoil</option>
    </select>
  </div>
  <div class="buylist-card" data-product-id="2" data-title="searing meditation">
    <img src="//playmantis.com.au/cdn/shop/files/aaaaaaaa-bbbb-cccc-dddd-222222222222.jpg">
    <p class="card-set">Ravnica: City of Guilds</p>
    <select class="finish-dropdown">
      <option data-variant-title="Nonfoil" data-credit-price="1.00">Nonfoil</option>
    </select>
  </div>
</div>`;
  const searingFuzzy = resolveOffersForScryfallId(
    parsePlaymantisHtml(searingFuzzyHtml, "2026-09-03T00:00:00.000Z"),
    searingId,
    "Searing Meditation",
    { setName: "Duel Decks: Ajani vs. Nicol Bolas" },
  );
  if (
    searingFuzzy.length !== 1 ||
    searingFuzzy[0].title !== "searing meditation" ||
    searingFuzzy[0].creditCents !== 100
  ) {
    messages.push("Fuzzy name page must bind Searing Meditation, not the first Shopify hit");
  }
  const nickFuryHtml = `<div class="buylist-grid">
  <div class="buylist-card" data-product-id="1" data-title="nick fury, agent of s.h.i.e.l.d. (borderless - scene)">
    <img src="//playmantis.com.au/cdn/shop/files/aaaaaaaa-bbbb-cccc-dddd-333333333333.jpg">
    <p class="card-set">Marvel Super Heroes</p>
    <select class="finish-dropdown">
      <option data-variant-title="Nonfoil" data-credit-price="2.00">Nonfoil</option>
    </select>
  </div>
  <div class="buylist-card" data-product-id="2" data-title="nick fury, agent of s.h.i.e.l.d.">
    <img src="//playmantis.com.au/cdn/shop/files/aaaaaaaa-bbbb-cccc-dddd-444444444444.jpg">
    <p class="card-set">Marvel Super Heroes</p>
    <select class="finish-dropdown">
      <option data-variant-title="Nonfoil" data-credit-price="0.50">Nonfoil</option>
    </select>
  </div>
</div>`;
  const nickFuryBound = resolveOffersForScryfallId(
    parsePlaymantisHtml(nickFuryHtml, "2026-09-03T00:00:00.000Z"),
    "3aa6fc02-ef76-426b-accd-6c0ef88b2a5e",
    "Nick Fury, Agent of S.H.I.E.L.D.",
    { setName: "Marvel Super Heroes" },
  );
  if (
    nickFuryBound.length !== 1 ||
    nickFuryBound[0].title !== "nick fury, agent of s.h.i.e.l.d." ||
    nickFuryBound[0].creditCents !== 50
  ) {
    messages.push("Name fallback should prefer the plain title over a borderless treatment");
  }
  const nameIdHitHtml = `<div class="buylist-grid" id="buylist-grid-container">
  <div class="buylist-card" data-product-id="1" data-title="ageless entity">
    <img src="//playmantis.com.au/cdn/shop/files/f2d9b77b-d775-4546-91c8-df438a1d8dbe.jpg">
    <select class="finish-dropdown">
      <option data-variant-title="Nonfoil" data-credit-price="0.50" data-inventory="0">Nonfoil</option>
    </select>
  </div>
  <div class="buylist-card" data-product-id="2" data-title="ageless entity">
    <img src="//playmantis.com.au/cdn/shop/files/8fefd7d1-8c70-4d54-be0a-f45833340670.jpg">
    <select class="finish-dropdown">
      <option data-variant-title="Nonfoil" data-credit-price="0.50">Nonfoil</option>
    </select>
  </div>
</div>`;
  const darksteelId = "f2d9b77b-d775-4546-91c8-df438a1d8dbe";
  const nameIdHit = resolveOffersForScryfallId(
    parsePlaymantisHtml(nameIdHitHtml, "2026-09-03T00:00:00.000Z"),
    darksteelId,
    "Ageless Entity",
  );
  if (
    nameIdHit.length !== 1 ||
    nameIdHit[0].scryfallId !== darksteelId ||
    nameIdHit[0].creditCents !== 50
  ) {
    messages.push("Name fallback should bind the product whose image UUID equals the CSV Scryfall ID");
  }
  const mismatchRetry = scryfallIdsNeedingPlaymantisFetch({
    ids: [searingId],
    namesById: { [searingId]: "Searing Meditation" },
    existing: [
      {
        scryfallId: searingId,
        title: "Mind Bend",
        finish: "nonfoil",
        creditCents: 40,
        limit: 4,
        missing: false,
        fetchedAt: "2026-09-03T00:00:00.000Z",
        imageUrl: "",
        setName: "",
      },
    ],
  });
  if (!mismatchRetry.includes(searingId)) {
    messages.push("Stored Playmantis title mismatch must be retried on harvest");
  }
  const missingOnce = scryfallIdsNeedingPlaymantisFetch({
    ids: [searingId],
    namesById: { [searingId]: "Searing Meditation" },
    existing: [
      {
        scryfallId: searingId,
        title: "Searing Meditation",
        finish: "nonfoil",
        creditCents: 0,
        limit: 0,
        missing: true,
        fetchedAt: "2026-09-03T00:00:00.000Z",
        imageUrl: "",
        setName: "",
      },
    ],
    skipIds: [searingId],
  });
  if (missingOnce.length) {
    messages.push("Missing Playmantis stubs already fetched this click must not loop");
  }
  const uuidDriftKeep = scryfallIdsNeedingPlaymantisFetch({
    ids: [fieldOfSoulsCsvId],
    namesById: { [fieldOfSoulsCsvId]: "Field of Souls" },
    existing: [
      {
        scryfallId: fieldOfSoulsCsvId,
        title: "Field of Souls",
        finish: "nonfoil",
        creditCents: 80,
        limit: 4,
        missing: false,
        fetchedAt: "2026-09-03T00:00:00.000Z",
        imageUrl: "https://playmantis.com.au/cdn/shop/files/bbbbbbbb-1111-2222-3333-444444444444.jpg",
        setName: "",
      },
    ],
  });
  if (!uuidDriftKeep.includes(fieldOfSoulsCsvId)) {
    messages.push("Title-matched stored offer must still refetch so remaining want can update");
  }
  const retryUnfound = scryfallIdsNeedingPlaymantisFetch({
    ids: [searingId, fieldOfSoulsCsvId],
    namesById: {
      [searingId]: "Searing Meditation",
      [fieldOfSoulsCsvId]: "Field of Souls",
    },
    existing: [
      {
        scryfallId: searingId,
        title: "Searing Meditation",
        finish: "nonfoil",
        creditCents: 0,
        limit: 0,
        missing: true,
        fetchedAt: "2026-09-03T00:00:00.000Z",
        imageUrl: "",
        setName: "",
      },
      {
        scryfallId: fieldOfSoulsCsvId,
        title: "Field of Souls",
        finish: "nonfoil",
        creditCents: 80,
        limit: 4,
        missing: false,
        fetchedAt: "2026-09-03T00:00:00.000Z",
        imageUrl: "",
        setName: "",
      },
    ],
    missingOnly: true,
  });
  if (retryUnfound.length !== 1 || retryUnfound[0] !== searingId) {
    messages.push("Retry unfound must fetch missing stubs and skip IDs that already have a live offer");
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
  if (armorSell) {
    messages.push("Armor Wars nonfoil at max stock should not Sell Playmantis");
  }
  if (pmOnly.buckets.unmatched.some((l) => l.name === "Armor Wars")) {
    messages.push("Armor Wars must not land in Unmatched when Playmantis shows credit");
  }
  const armorNeither = pmOnly.buckets.neither.find((l) => l.name === "Armor Wars");
  if (!armorNeither || armorNeither.quantity !== 1) {
    messages.push("Armor Wars at max Playmantis stock should sit in Neither (want 0)");
  }

  const foilOnlyId = "f3ffb0ab-d7bf-4136-9aa7-0a4965581a75";
  const foilOnlyHtml = parsePlaymantisHtml(
    `<div class="buylist-grid" id="buylist-grid-container">
  <div class="buylist-card" data-product-id="1" data-title="brims barone">
    <img src="//playmantis.com.au/cdn/shop/files/${foilOnlyId}.jpg">
    <select class="finish-dropdown">
      <option data-variant-title="Foil" data-credit-price="0.50" data-inventory="0">Foil</option>
    </select>
  </div>
</div>`,
    "2026-09-03T00:00:00.000Z",
    foilOnlyId,
  );
  const foilOnlyRow = {
    ...armor,
    name: "Brims Barone",
    foil: "normal",
    scryfallId: foilOnlyId,
    quantity: 1,
  };
  const foilOnlyAlloc = allocate({
    rows: [foilOnlyRow],
    mateOffers: [],
    playmantisOffers: foilOnlyHtml,
  });
  const foilOnlySell = foilOnlyAlloc.buckets.playmantis.find((l) => l.name === "Brims Barone");
  if (!foilOnlySell || foilOnlySell.quantity !== 1) {
    messages.push("Playmantis foil-only product should still match a CSV normal row (single-variant fallback)");
  }

  const streamsPmOnly = withAllocateResults({
    ...emptyMtgBuylistStore(),
    csv: {
      filename: "t.csv",
      uploadedAt: "2026-09-03T00:00:00.000Z",
      rows: csv,
      priceSource: "other",
      priceCurrency: "AUD",
    },
    playmantis: { fetchedAt: "2026-09-03T00:00:00.000Z", offers: pm },
    mate: null,
  });
  if (!streamsPmOnly.resultPm || !streamsPmOnly.resultCompare) {
    messages.push("Compare should be available when one store allocate is completed");
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
    streamRows[0].wanted !== 0 ||
    streamRows[0].sell !== 0 ||
    streamRows[0].tone !== "capped"
  ) {
    messages.push("PM stream row at max stock should be want 0 / capped, not sellable");
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
    purchasePriceCents: 68,
    purchaseCurrency: "AUD",
    frameEffects: [] as string[],
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
    purchasePriceCents: 180,
    purchaseCurrency: "AUD",
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

  const pmPack = parseManaBoxCsv(manaBoxPackingCsv(csv, compareAll, "playmantis"));
  const matePack = parseManaBoxCsv(manaBoxPackingCsv(csv, compareAll, "mate"));
  const unsoldPack = parseManaBoxCsv(manaBoxPackingCsv(csv, compareAll, "unsold"));
  const searingPmPack = pmPack.find((r) => r.name === "Searing Meditation");
  const agelessMatePack = matePack.find((r) => r.name === "Ageless Entity");
  const unknownUnsold = unsoldPack.find((r) => r.name === "Unknown Card");
  if (!searingPmPack || searingPmPack.quantity !== 1) {
    messages.push("ManaBox Playmantis export should use Compare Sell qty for Searing Meditation");
  }
  if (pmPack.some((r) => r.name === "Ageless Entity")) {
    messages.push("ManaBox Playmantis export must not include Mate-only winners");
  }
  if (!agelessMatePack || agelessMatePack.quantity !== 1) {
    messages.push("ManaBox Mate export should use Compare Sell qty for Ageless Entity");
  }
  if (!unknownUnsold || unknownUnsold.quantity !== 1) {
    messages.push("ManaBox not-sold export should keep cards neither store is buying");
  }
  if (unsoldPack.some((r) => r.name === "Searing Meditation")) {
    messages.push("Searing Meditation sold to Playmantis must not appear in not-sold");
  }

  const leftoverSold = parseSubmissionCsv(
    "Name,Set code,Quantity,Scryfall ID,Foil\nSearing Meditation,DDH,1,6f5e0200-21c9-4926-b238-3f9b1f5fc6ed,normal\n",
  );
  const leftover = subtractSoldFromManaBox(csv, [leftoverSold]);
  if (leftover.leftover.some((r) => r.name === "Searing Meditation")) {
    messages.push("Leftover ManaBox should drop a fully submitted printing");
  }
  if (leftover.removedCopies !== 1) {
    messages.push("Leftover subtract should remove 1 submitted copy");
  }
  const stack = parseManaBoxCsv(
    "Name,Set code,Quantity,Scryfall ID,Foil\nForest,DDH,3,aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee,normal\n",
  );
  const soldOne = parseSubmissionCsv(
    "Name,Set code,Quantity,Scryfall ID,Foil\nForest,DDH,1,aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee,normal\n",
  );
  const partial = subtractSoldFromManaBox(stack, [soldOne]);
  if (partial.leftover[0]?.quantity !== 2) {
    messages.push("Partial store submission should leave remaining quantity");
  }
  const ghost = subtractSoldFromManaBox(csv, [
    parseSubmissionCsv(
      "Name,Set code,Quantity,Scryfall ID,Foil\nGhost Card,XXX,1,eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee,normal\n",
    ),
  ]);
  if (ghost.unmatched.length !== 1 || ghost.removedCopies !== 0) {
    messages.push("Unknown submission line should stay unmatched and not remove copies");
  }

  return { ok: messages.length === 0, messages };
}
