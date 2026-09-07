import { harvestPlaymantis } from "../src/modules/mtg-buylist/logic/playmantis.ts";

async function main() {
  const offers = await harvestPlaymantis({
    scryfallIds: ["a4f9d79a-dff5-46e1-b767-30a451b54942"],
    namesById: { "a4f9d79a-dff5-46e1-b767-30a451b54942": "Ageless Entity" },
    setNamesById: { "a4f9d79a-dff5-46e1-b767-30a451b54942": "Duel Decks: Ajani vs. Nicol Bolas" },
  });
  console.log(
    JSON.stringify(
      offers.map((o) => ({
        missing: o.missing,
        title: o.title,
        setName: o.setName,
        finish: o.finish,
        credit: o.creditCents,
        limit: o.limit,
      })),
      null,
      2,
    ),
  );
}

void main();
