// CeremoDay/api/src/config/documentTemplates.ts

export type CeremonyType = "civil" | "concordat";

export type TemplateCategory = "USC" | "KOSCIOŁ" | "URZĄD" | "INNE";
export type TemplateHolder = "bride" | "groom" | "both" | null;

export interface DocumentTemplate {
  name: string;
  description: string;
  category: TemplateCategory;
  holder: TemplateHolder;
  is_extra: boolean; // czy to punkt "nadzwyczajny"
}

// --- ŚLUB CYWILNY ---

const civilBase: DocumentTemplate[] = [
  {
    name: "Dokument tożsamości narzeczonych",
    description:
      "Dowód osobisty lub paszport – do okazania w USC przy zgłoszeniu zamiaru zawarcia małżeństwa oraz w dniu ślubu.",
    category: "USC",
    holder: "both",
    is_extra: false,
  },
  {
    name: "Odpis aktu urodzenia narzeczonych",
    description:
      "Skrócone odpisy aktów urodzenia (często USC ma je w systemie, ale traktuj jako dokument do odhaczenia – szczególnie, jeśli akty są z innego urzędu lub z zagranicy).",
    category: "USC",
    holder: "both",
    is_extra: false,
  },
  {
    name: "Dowód opłaty skarbowej za sporządzenie aktu małżeństwa",
    description:
      "Potwierdzenie dokonania opłaty skarbowej za sporządzenie aktu małżeństwa (wysokość opłaty zgodnie z aktualnymi stawkami USC).",
    category: "USC",
    holder: "both",
    is_extra: false,
  },
  {
    name: "Zapewnienie o braku przeszkód do zawarcia małżeństwa",
    description:
      "Oświadczenie składane w USC, że narzeczeni nie wiedzą o istnieniu przeszkód do zawarcia małżeństwa – wypełniane i podpisywane podczas wizyty w urzędzie.",
    category: "USC",
    holder: "both",
    is_extra: false,
  },
  {
    name: "Wybór nazwisk małżonków i dzieci",
    description:
      "Oświadczenie w USC dotyczące tego, jakie nazwiska będą nosili małżonkowie po ślubie oraz jakie nazwiska będą nadane przyszłym dzieciom.",
    category: "USC",
    holder: "both",
    is_extra: false,
  },
  {
    name: "Rezerwacja terminu i miejsca ślubu cywilnego",
    description:
      "Rezerwacja terminu i miejsca ceremonii (sala USC lub miejsce plenerowe). W przypadku pleneru może być wymagana dodatkowa opłata i wniosek.",
    category: "USC",
    holder: "both",
    is_extra: false,
  },
];

const civilExtra: DocumentTemplate[] = [
  {
    name: "Zezwolenie sądu na zawarcie małżeństwa",
    description:
      "Postanowienie sądu rodzinnego zezwalające na zawarcie małżeństwa w szczególnych przypadkach (np. małoletniość, bliskie pokrewieństwo).",
    category: "URZĄD",
    holder: "both",
    is_extra: true,
  },
  {
    name: "Zezwolenie sądu na zawarcie małżeństwa przez pełnomocnika i pełnomocnictwo",
    description:
      "Postanowienie sądu oraz pisemne pełnomocnictwo – wymagane, gdy jedno z narzeczonych zawiera małżeństwo przez pełnomocnika.",
    category: "URZĄD",
    holder: "both",
    is_extra: true,
  },
  {
    name: "Dokument potwierdzający ustanie poprzedniego małżeństwa",
    description:
      "Odpis aktu małżeństwa z adnotacją o rozwodzie lub odpis aktu zgonu poprzedniego małżonka – wymagane, jeżeli wcześniej pozostawałaś/eś w związku małżeńskim.",
    category: "USC",
    holder: "both",
    is_extra: true,
  },
  {
    name: "Dokument potwierdzający możliwość zawarcia małżeństwa (dla cudzoziemca)",
    description:
      "Zaświadczenie z kraju pochodzenia lub polskiego sądu, że cudzoziemiec może zawrzeć małżeństwo zgodnie z prawem swojego państwa.",
    category: "URZĄD",
    holder: "both",
    is_extra: true,
  },
  {
    name: "Tłumaczenia przysięgłe dokumentów obcojęzycznych",
    description:
      "Tłumaczenia aktów stanu cywilnego i innych dokumentów wykonane przez tłumacza przysięgłego lub konsula – wymagane przy dokumentach z zagranicy.",
    category: "URZĄD",
    holder: "both",
    is_extra: true,
  },
  {
    name: "Tłumacz podczas czynności w USC",
    description:
      "Zapewnienie tłumacza, jeśli któreś z narzeczonych nie posługuje się językiem polskim – dotyczy zarówno formalności w USC, jak i samej przysięgi.",
    category: "USC",
    holder: "both",
    is_extra: true,
  },
  {
    name: "Wniosek o ślub cywilny poza USC (w plenerze)",
    description:
      "Wniosek o udzielenie ślubu poza urzędem stanu cywilnego (np. w plenerze), wraz z dodatkową opłatą zgodnie z aktualnymi przepisami.",
    category: "USC",
    holder: "both",
    is_extra: true,
  },
];

// --- ŚLUB KONKORDATOWY ---

const concordatUscBase: DocumentTemplate[] = [
  {
    name: "Dokument tożsamości narzeczonych",
    description:
      "Dowód osobisty lub paszport – do okazania przy załatwianiu formalności w USC związanych ze ślubem wyznaniowym ze skutkami cywilnymi.",
    category: "USC",
    holder: "both",
    is_extra: false,
  },
  {
    name: "Odpis aktu urodzenia narzeczonych",
    description:
      "Skrócone odpisy aktów urodzenia, jeżeli USC nie ma ich w systemie – wykorzystywane do sporządzenia dokumentacji do ślubu konkordatowego.",
    category: "USC",
    holder: "both",
    is_extra: false,
  },
  {
    name: "Dowód opłaty skarbowej za wydanie zaświadczeń do ślubu konkordatowego",
    description:
      "Potwierdzenie opłaty skarbowej za wydanie zaświadczenia z USC o braku przeszkód do zawarcia małżeństwa wyznaniowego ze skutkami cywilnymi.",
    category: "USC",
    holder: "both",
    is_extra: false,
  },
  {
    name: "Zaświadczenie z USC o braku okoliczności wykluczających zawarcie małżeństwa",
    description:
      "Zaświadczenie wydawane przez USC (zwykle w trzech egzemplarzach), które przekazuje się do parafii. Ważne przez określony czas (np. 6 miesięcy).",
    category: "USC",
    holder: "both",
    is_extra: false,
  },
  {
    name: "Zapewnienie o braku przeszkód i wybór nazwisk (USC)",
    description:
      "Oświadczenia składane w USC – podobnie jak przy ślubie cywilnym – dotyczące braku przeszkód i wyboru nazwisk małżonków oraz dzieci.",
    category: "USC",
    holder: "both",
    is_extra: false,
  },
];

const concordatChurchBase: DocumentTemplate[] = [
  {
    name: "Świadectwo chrztu narzeczonych",
    description:
      "Aktualne świadectwa chrztu z parafii chrztu (często z adnotacją o bierzmowaniu); zazwyczaj ważne kilka miesięcy (np. 3–6).",
    category: "KOSCIOŁ",
    holder: "both",
    is_extra: false,
  },
  {
    name: "Świadectwo bierzmowania",
    description:
      "Potwierdzenie przyjęcia sakramentu bierzmowania – osobny dokument lub adnotacja na świadectwie chrztu.",
    category: "KOSCIOŁ",
    holder: "both",
    is_extra: false,
  },
  {
    name: "Zaświadczenie ukończenia nauk przedmałżeńskich",
    description:
      "Zaświadczenie potwierdzające odbycie kursu przedmałżeńskiego wymaganego przez parafię.",
    category: "KOSCIOŁ",
    holder: "both",
    is_extra: false,
  },
  {
    name: "Zaświadczenie z poradni życia rodzinnego",
    description:
      "Potwierdzenie odbycia wymaganych spotkań w poradni życia rodzinnego.",
    category: "KOSCIOŁ",
    holder: "both",
    is_extra: false,
  },
  {
    name: "Zaświadczenie o wygłoszonych zapowiedziach",
    description:
      "Dokument potwierdzający odczytanie zapowiedzi przedślubnych w parafii (lub parafiach) narzeczonych.",
    category: "KOSCIOŁ",
    holder: "both",
    is_extra: false,
  },
  {
    name: "Protokół przedślubny (rozmowa kanoniczna)",
    description:
      "Protokół sporządzany podczas rozmowy z duszpasterzem, obejmujący kanoniczny wywiad przedślubny.",
    category: "KOSCIOŁ",
    holder: "both",
    is_extra: false,
  },
  {
    name: "Świadectwa ukończenia katechezy szkolnej (jeśli wymagane)",
    description:
      "Świadectwa z oceną z religii lub inne dokumenty potwierdzające uczestnictwo w katechezie – wymagane w niektórych parafiach.",
    category: "KOSCIOŁ",
    holder: "both",
    is_extra: false,
  },
  {
    name: "Dane świadków",
    description:
      "Imiona, nazwiska, daty urodzenia oraz dane z dokumentów tożsamości świadków – wymagane do przygotowania protokołu i zapisu w księgach.",
    category: "KOSCIOŁ",
    holder: "both",
    is_extra: false,
  },
];

const concordatExtra: DocumentTemplate[] = [
  {
    name: "Delegacja lub licencja z parafii zamieszkania",
    description:
      "Zgoda proboszcza parafii zamieszkania na udzielenie ślubu w innej parafii (delegacja/licencja).",
    category: "KOSCIOŁ",
    holder: "both",
    is_extra: true,
  },
  {
    name: "Zgoda biskupa na ślub poza parafią / w szczególnym miejscu",
    description:
      "Zgoda ordynariusza na zawarcie małżeństwa w innym kościele lub wyjątkowym miejscu, jeśli tego wymagają przepisy diecezjalne.",
    category: "KOSCIOŁ",
    holder: "both",
    is_extra: true,
  },
  {
    name: "Zgoda na małżeństwo mieszane lub z osobą nieochrzczoną",
    description:
      "Odpowiednie dyspensy i zgody kościelne, gdy jedno z narzeczonych jest innego wyznania lub nieochrzczone.",
    category: "KOSCIOŁ",
    holder: "both",
    is_extra: true,
  },
  {
    name: "Dokumenty dotyczące unieważnienia poprzedniego małżeństwa (prawo kanoniczne)",
    description:
      "Wyrok sądu kościelnego stwierdzający nieważność poprzedniego małżeństwa, jeśli taka sytuacja ma miejsce.",
    category: "KOSCIOŁ",
    holder: "both",
    is_extra: true,
  },
  {
    name: "Dokumenty dotyczące poprzedniego małżeństwa cywilnego",
    description:
      "Odpis aktu małżeństwa cywilnego z adnotacją o rozwodzie lub innymi informacjami, jeżeli ślub kościelny zawierany jest po cywilnym.",
    category: "USC",
    holder: "both",
    is_extra: true,
  },
];

export function getTemplatesForCeremony(
  ceremonyType: CeremonyType,
  includeExtras: boolean
): DocumentTemplate[] {
  if (ceremonyType === "civil") {
    return includeExtras ? [...civilBase, ...civilExtra] : [...civilBase];
  }

  // "concordat"
  const base = [...concordatUscBase, ...concordatChurchBase];
  const extras = includeExtras ? concordatExtra : [];
  return [...base, ...extras];
}
