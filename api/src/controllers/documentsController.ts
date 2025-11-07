import { Request, Response } from "express";

export const getDefaultCivilDocuments = async (_req: Request, res: Response) => {
  const defaults = [
    {
      name: "Dokument tożsamości",
      description: "Dowód osobisty lub paszport – do okazania w USC.",
      type: "civil",
      due_date: null,
      checked: false,
    },
    {
      name: "Dowód opłaty skarbowej",
      description: "Można zapłacić w kasie urzędu lub przelewem na konto urzędu.",
      type: "civil",
      due_date: null,
      checked: false,
    },
    {
      name: "Zezwolenie sądu na zawarcie małżeństwa",
      description: "Jeśli wymagane – dostarczone orzeczenie sądu.",
      type: "civil",
      due_date: null,
      checked: false,
    },
    {
      name: "Pełnomocnictwo i zezwolenie sądu na zawarcie małżeństwa przez pełnomocnika",
      description: "Jeśli ślub zawierany przez pełnomocnika.",
      type: "civil",
      due_date: null,
      checked: false,
    },
    {
      name: "Akt urodzenia (lub zagraniczny odpowiednik)",
      description: "Dla obywateli Polski mieszkających za granicą – z tłumaczeniem przysięgłym.",
      type: "civil",
      due_date: null,
      checked: false,
    },
    {
      name: "Dokument potwierdzający ustanie lub nieistnienie poprzedniego małżeństwa",
      description: "Dotyczy osób wcześniej pozostających w związku małżeńskim.",
      type: "civil",
      due_date: null,
      checked: false,
    },
    {
      name: "Dokument potwierdzający możliwość zawarcia małżeństwa (dla cudzoziemca)",
      description: "Jeśli uzyskanie dokumentu niemożliwe – orzeczenie sądu o zwolnieniu z obowiązku.",
      type: "civil",
      due_date: null,
      checked: false,
    },
    {
      name: "Tłumaczenia przysięgłe dokumentów obcojęzycznych",
      description: "Przygotowane przez tłumacza przysięgłego lub konsula RP.",
      type: "civil",
      due_date: null,
      checked: false,
    },
    {
      name: "Tłumacz / biegły podczas rozmowy w USC",
      description: "Jeśli któreś z narzeczonych nie mówi po polsku.",
      type: "civil",
      due_date: null,
      checked: false,
    },
    {
      name: "Zapewnienie o braku przeszkód małżeńskich",
      description: "Podpisywane w USC podczas wizyty.",
      type: "civil",
      due_date: null,
      checked: false,
    },
    {
      name: "Wniosek o ślub poza urzędem (opcjonalnie)",
      description: "Składany jeśli ceremonia odbywa się poza USC.",
      type: "civil",
      due_date: null,
      checked: false,
    },
  ];

  res.json(defaults);
};
