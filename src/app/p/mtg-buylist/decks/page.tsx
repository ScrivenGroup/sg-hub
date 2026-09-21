import { getPreconCatalog, getPreconHarvestBook } from "@/core/store/json-store";
import { requireBuylistStaff } from "@/modules/mtg-buylist/actions";
import { MtgBuylistDecks } from "@/modules/mtg-buylist/ui/MtgBuylistDecks";

export const dynamic = "force-dynamic";

export default async function MtgBuylistDecksPage({
  searchParams,
}: {
  searchParams: Promise<{ deck?: string }>;
}) {
  const staff = await requireBuylistStaff();
  if (!staff) {
    return (
      <div className="sg-card">
        <p className="font-medium">Sign in to view decks</p>
      </div>
    );
  }

  const params = await searchParams;
  const [catalog, harvest] = await Promise.all([getPreconCatalog(), getPreconHarvestBook()]);

  return (
    <MtgBuylistDecks
      initialCatalog={catalog}
      initialHarvest={harvest}
      initialDeckId={params.deck}
    />
  );
}
