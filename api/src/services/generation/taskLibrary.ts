import type { TaskCategory } from "../../models/Task";

export type InterviewCeremonyType = "CIVIL" | "CHURCH" | "RECEPTION_ONLY";

export type TaskModule =
  | "guests"
  | "inspirations"
  | "finance"
  | "weddingDay"
  | "vendors"
  | "formalities";

export type TaskTemplate = {
  key: string;
  title: string;
  module: TaskModule;
  category: TaskCategory;
  offsetDays: number; // wzgledem daty slubu
  ceremonyScope?: "CIVIL" | "CHURCH" | "RECEPTION_ONLY" | "BOTH" | "ANY";
  description: string; // jeden string
};

export const TASK_LIBRARY: TaskTemplate[] = [
  // ============================================================
  // A) WSPOLNE
  // Widełki:
  // 12-9 mies:  -365..-270
  // 9-6 mies:   -270..-180
  // 6-3 mies:   -180..-90
  // 3-1 mies:   -90..-30
  // 30-7 dni:   -30..-7
  // 7-1 dzien:  -7..-1
  // dzien 0:    0
  // po:         1..30
  // ============================================================

  // 12–9 mies
  {
    key: "fin_initial_budget",
    title: "Finanse: ustaw budżet globalny wydarzenia (widełki + rezerwa)",
    module: "finance",
    category: "ORGANIZACJA",
    offsetDays: -340,
    ceremonyScope: "ANY",
    description:
      "CO I PO CO\n" +
      "Budzet wyznacza ramy decyzji i pomaga uniknac przekroczenia kosztow.\n\n" +
      "JAK TO ZROBIC\n" +
      "- ustal maksymalna kwote na wydarzenie\n" +
      "- dodaj rezerwe 5-15 procent\n" +
      "- zapisz budzet w module Finanse\n\n" +
      "KIEDY UZNAC ZA ZROBIONE\n" +
      "- budzet jest zapisany\n" +
      "- rezerwa jest uwzgledniona (w kwocie lub notatce)\n\n" +
      "WSKAZOWKI\n" +
      "- nie planuj budzetu na styk\n" +
      "- jesli nie znasz cen, wpisz widełki",
  },
  {
    key: "fin_initial_cost_plan",
    title: "Finanse: zrób wstępny plan kosztów (kategorie + priorytety wydatków)",
    module: "finance",
    category: "ORGANIZACJA",
    offsetDays: -332,
    ceremonyScope: "ANY",
    description:
      "CO I PO CO\n" +
      "Plan kosztow pokazuje co bedzie najdrozsze i gdzie potrzebne sa kompromisy.\n\n" +
      "JAK TO ZROBIC\n" +
      "- wypisz glowne kategorie (sala, catering, muzyka, stroje, foto, dekoracje)\n" +
      "- wpisz orientacyjne kwoty lub widełki\n" +
      "- oznacz must have i nice to have w notatkach\n" +
      "- dodaj planowane pozycje w Finansach (status Planowane)\n\n" +
      "KIEDY UZNAC ZA ZROBIONE\n" +
      "- sa pozycje w glownych kategoriach\n" +
      "- priorytety sa jasne (co jest najwazniejsze)\n\n" +
      "WSKAZOWKI\n" +
      "- aktualizuj plan po wyborze sali i cateringu\n" +
      "- zostaw margines na koszty drobne i dojazdy",
  },
  {
    key: "guests_initial_list",
    title: "Goście: przygotuj wstępną listę gości (szacunek + zakres liczby osób)",
    module: "guests",
    category: "ORGANIZACJA",
    offsetDays: -324,
    ceremonyScope: "ANY",
    description:
      "CO I PO CO\n" +
      "Lista gosci pozwala dobrac sale, catering i budzet. Bez skali trudno planowac.\n\n" +
      "JAK TO ZROBIC\n" +
      "- dodaj osoby lub rodziny (na start moze byc orientacyjnie)\n" +
      "- oznacz relacje i strone (pani mlodej, pana mlodego)\n" +
      "- dopisz notatki o dzieciach, dojazdach, noclegach\n" +
      "- zapisz zakres liczby osob (min-max)\n\n" +
      "KIEDY UZNAC ZA ZROBIONE\n" +
      "- lista istnieje w systemie\n" +
      "- znasz przyblizona liczbe gosci i zakres\n\n" +
      "WSKAZOWKI\n" +
      "- osoby niepewne oznacz w notatce\n" +
      "- nie walcz o perfekcje, wazna jest skala",
  },
  {
    key: "vendors_hold_date",
    title: "Organizacja: wybierz datę orientacyjną i zablokuj termin (jeśli możliwe)",
    module: "vendors",
    category: "ORGANIZACJA",
    offsetDays: -316,
    ceremonyScope: "ANY",
    description:
      "CO I PO CO\n" +
      "Data jest baza harmonogramu. Bez niej rezerwacje i plan zadan nie maja sensu.\n\n" +
      "JAK TO ZROBIC\n" +
      "- wybierz 1-2 preferowane terminy plus plan B\n" +
      "- sprawdz dostepnosc kluczowych osob i miejsc\n" +
      "- jesli to mozliwe, wstepnie zablokuj termin u sali lub USC/parafii\n" +
      "- ustaw date w wydarzeniu\n\n" +
      "KIEDY UZNAC ZA ZROBIONE\n" +
      "- data jest ustawiona\n" +
      "- wiesz czy termin jest wstepnie potwierdzony\n\n" +
      "WSKAZOWKI\n" +
      "- plan B oszczedza stres gdy termin sie wysypie\n" +
      "- zapisuj informacje o dostepnosci od razu w notatkach",
  },
  {
    key: "insp_style_assumptions",
    title: "Inspiracje: ustal styl i założenia (klimat, kolorystyka, must-have / never)",
    module: "inspirations",
    category: "DEKORACJE",
    offsetDays: -308,
    ceremonyScope: "ANY",
    description:
      "CO I PO CO\n" +
      "Styl i zasady pomagaja podejmowac spójne decyzje o dekoracjach, strojach i dodatkach.\n\n" +
      "JAK TO ZROBIC\n" +
      "- wybierz 1-2 style i 2-3 kolory\n" +
      "- spisz must have (rzeczy konieczne)\n" +
      "- spisz never (czego nie chcesz)\n" +
      "- dodaj to do Inspiracji lub notatek\n\n" +
      "KIEDY UZNAC ZA ZROBIONE\n" +
      "- masz zapisany styl i kolory\n" +
      "- masz liste must have i never\n\n" +
      "WSKAZOWKI\n" +
      "- lista never zmniejsza liczbe przypadkowych zakupow\n" +
      "- nie komplikuj: jedna os przewodnia wystarczy",
  },
  {
    key: "vendors_key_reservations",
    title: "Usługodawcy: zarezerwuj kluczowe usługi (sala/przyjęcie + muzyka DJ/zespół)",
    module: "vendors",
    category: "ORGANIZACJA",
    offsetDays: -300,
    ceremonyScope: "ANY",
    description:
      "CO I PO CO\n" +
      "Sala i muzyka kotwicza plan i budzet. Najlepsze terminy znikaja najszybciej.\n\n" +
      "JAK TO ZROBIC\n" +
      "- zrob shortlistę 3-5 miejsc i 3-5 opcji muzyki\n" +
      "- porownaj ceny, dostępność, warunki zaliczek i anulacji\n" +
      "- obejrzyj miejsce i ustal szczegoly (co jest w cenie)\n" +
      "- potwierdz rezerwacje i zapisz terminy platnosci w Finansach\n\n" +
      "KIEDY UZNAC ZA ZROBIONE\n" +
      "- sala i muzyka sa potwierdzone na termin\n" +
      "- warunki platnosci sa zapisane\n\n" +
      "WSKAZOWKI\n" +
      "- dopytaj o doplaty (korkowe, sprzatanie, przedluzenie)\n" +
      "- zapisz kontakt do osoby decyzyjnej po stronie sali",
  },
  {
    key: "vendors_photo_video_choice",
    title: "Usługodawcy: wybierz fotografa/kamerzystę (jeśli dotyczy)",
    module: "vendors",
    category: "USLUGI",
    offsetDays: -292,
    ceremonyScope: "ANY",
    description:
      "CO I PO CO\n" +
      "Foto i wideo to pamiatka. Dobry termin u sprawdzonej osoby szybko znika.\n\n" +
      "JAK TO ZROBIC\n" +
      "- wybierz styl (reportaz vs pozowane)\n" +
      "- porownaj portfolio i opinie\n" +
      "- ustal zakres: liczba godzin, termin oddania, album, film\n" +
      "- podpisz umowe i zapisz zaliczke oraz termin platnosci\n\n" +
      "KIEDY UZNAC ZA ZROBIONE\n" +
      "- fotograf lub kamerzysta jest zarezerwowany\n" +
      "- znasz zakres i termin oddania materialu\n\n" +
      "WSKAZOWKI\n" +
      "- zawsze ustal kto robi selekcje i ile jest poprawek\n" +
      "- dopytaj o dojazd i ewentualne doplaty",
  },
  {
    key: "wd_day_scenario_outline",
    title: "Dzień ślubu: zarysuj scenariusz dnia (ceremonia → przyjęcie → after/poprawiny)",
    module: "weddingDay",
    category: "DZIEN_SLUBU",
    offsetDays: -284,
    ceremonyScope: "ANY",
    description:
      "CO I PO CO\n" +
      "Zarys dnia pozwala wczesnie wykryc konflikty czasowe i potrzeby logistyczne.\n\n" +
      "JAK TO ZROBIC\n" +
      "- wypisz etapy: przygotowania, ceremonia, dojazdy, przyjecie, zakonczenie\n" +
      "- dopisz orientacyjne godziny i miejsca\n" +
      "- dopisz kto odpowiada za kluczowe rzeczy (dokumenty, obraczki)\n" +
      "- zapisz szkic w module Dzien slubu\n\n" +
      "KIEDY UZNAC ZA ZROBIONE\n" +
      "- etapy dnia sa zapisane w kolejnosci\n" +
      "- sa orientacyjne godziny i miejsca\n\n" +
      "WSKAZOWKI\n" +
      "- dodaj bufory na dojazdy\n" +
      "- trzymaj plan prosty, latwo go potem dopracowac",
  },

  // 9–6 mies
  {
    key: "vendors_menu_catering_tastings",
    title: "Usługodawcy: ustal wstępne menu/catering/tort + degustacje (jeśli dotyczy)",
    module: "vendors",
    category: "USLUGI",
    offsetDays: -260,
    ceremonyScope: "ANY",
    description:
      "CO I PO CO\n" +
      "Menu ustala komfort gosci i duza czesc budzetu. Wczesne decyzje zmniejszaja stres.\n\n" +
      "JAK TO ZROBIC\n" +
      "- ustal liczbe dan i sposob podania\n" +
      "- zbierz potrzeby diet (alergie, wege, dzieci)\n" +
      "- umow degustacje lub popros o przykładowe menu\n" +
      "- zapisz koszt i warunki w Finansach\n\n" +
      "KIEDY UZNAC ZA ZROBIONE\n" +
      "- masz wstepnie wybrane menu i formę podania\n" +
      "- wiesz kto odpowiada za tort (sala/catering/osobno)\n\n" +
      "WSKAZOWKI\n" +
      "- dopytaj o korkowe i napoje\n" +
      "- ustal godziny podawania posilkow wstepnie do planu dnia",
  },
  {
    key: "insp_decor_florist_concept",
    title: "Inspiracje: dekoracje/florysta + koncepcja stołów/sali (jeśli dotyczy)",
    module: "inspirations",
    category: "DEKORACJE",
    offsetDays: -252,
    ceremonyScope: "ANY",
    description:
      "CO I PO CO\n" +
      "Koncepcja dekoracji zapobiega przypadkowym zakupom i ulatwia rozmowy z florysta.\n\n" +
      "JAK TO ZROBIC\n" +
      "- zbierz inspiracje: stoly, kwiaty, swiatlo, dodatki\n" +
      "- wybierz elementy kluczowe i ogranicz liste do realnego budzetu\n" +
      "- ustal co zapewnia sala, co florysta, a co kupujesz sam\n" +
      "- zapisz liste rzeczy do kupienia lub wypozyczenia\n\n" +
      "KIEDY UZNAC ZA ZROBIONE\n" +
      "- masz spójna koncepcje dekoracji\n" +
      "- znasz zakres odpowiedzialnosci (kto co robi)\n\n" +
      "WSKAZOWKI\n" +
      "- dopisz wymiary lub ograniczenia sali jesli znane\n" +
      "- mniej elementow, ale lepszej jakosci, zwykle wyglada lepiej",
  },
  {
    key: "wd_attractions_plan",
    title: "Dzień ślubu: zaplanuj atrakcje (opcjonalnie)",
    module: "weddingDay",
    category: "DZIEN_SLUBU",
    offsetDays: -244,
    ceremonyScope: "ANY",
    description:
      "CO I PO CO\n" +
      "Atrakcje wymagaja czasu w harmonogramie i czesto dodatkowej logistyki.\n\n" +
      "JAK TO ZROBIC\n" +
      "- wybierz 1-3 atrakcje pasujace do gosci i stylu\n" +
      "- sprawdz czas trwania i wymagania (prad, miejsce, prowadzenie)\n" +
      "- wpisz atrakcje do szkicu planu dnia\n" +
      "- oszacuj koszty i dodaj do Finansow\n\n" +
      "KIEDY UZNAC ZA ZROBIONE\n" +
      "- masz liste atrakcji lub decyzje ze rezygnujesz\n" +
      "- atrakcje maja miejsce w planie dnia\n\n" +
      "WSKAZOWKI\n" +
      "- za duzo atrakcji rozbija posilki i rozmowy\n" +
      "- sprawdz ograniczenia sali (halas, godziny, pirotechnika)",
  },
  {
    key: "wd_day_team",
    title: "Dzień ślubu: ustal ekipę dnia (świadkowie, osoby do pomocy, koordynator kontaktu)",
    module: "weddingDay",
    category: "LOGISTYKA",
    offsetDays: -236,
    ceremonyScope: "ANY",
    description:
      "CO I PO CO\n" +
      "Podzial ról zmniejsza stres. Para mloda nie powinna odbierac telefonow i gasic pozarow.\n\n" +
      "JAK TO ZROBIC\n" +
      "- wyznacz jedna osobe jako koordynatora kontaktu\n" +
      "- rozdziel zadania: odbior rzeczy, kontakt z sala, transport\n" +
      "- zbierz numery i wpisz do kontaktow dnia\n" +
      "- ustal zasady: kto podejmuje decyzje w razie problemu\n\n" +
      "KIEDY UZNAC ZA ZROBIONE\n" +
      "- koordynator jest wyznaczony\n" +
      "- role i kontakty sa zapisane\n\n" +
      "WSKAZOWKI\n" +
      "- koordynator musi byc dostępny i ogarniety\n" +
      "- jedna osoba od kontaktu to mniej zamieszania",
  },
  {
    key: "vendors_outfits_direction",
    title: "Usługodawcy: stroje – wybór kierunku + wstępne przymiarki/rezerwacje",
    module: "vendors",
    category: "USLUGI",
    offsetDays: -228,
    ceremonyScope: "ANY",
    description:
      "CO I PO CO\n" +
      "Stroje wymagaja czasu na przymiarki i poprawki. Wczesny start to mniej presji.\n\n" +
      "JAK TO ZROBIC\n" +
      "- wybierz styl stroju zgodny z motywem i miejscem\n" +
      "- umow przymiarki lub przeglad salonow\n" +
      "- zaplanuj terminy kolejnych przymiarek\n" +
      "- uwzglednij dodatki (buty, welon, koszula) w planie\n\n" +
      "KIEDY UZNAC ZA ZROBIONE\n" +
      "- masz wybrany kierunek i nastepne kroki\n" +
      "- terminy przymiarek sa zapisane\n\n" +
      "WSKAZOWKI\n" +
      "- zostaw bufor na poprawki\n" +
      "- dopisz koszty dodatkow, bo potrafia zaskoczyc",
  },
  {
    key: "vendors_transport_plan",
    title: "Usługodawcy: transport (auto/busy) – jeśli potrzebne",
    module: "vendors",
    category: "LOGISTYKA",
    offsetDays: -220,
    ceremonyScope: "ANY",
    description:
      "CO I PO CO\n" +
      "Transport zmniejsza ryzyko spoznien i pomaga gosciom bez dojazdu.\n\n" +
      "JAK TO ZROBIC\n" +
      "- zdecyduj czy potrzebujesz transportu dla pary, gosci, czy obu\n" +
      "- ustal trasy i orientacyjne godziny\n" +
      "- oszacuj liczbe osób do przewozu\n" +
      "- dodaj dostawce lub zapisz plan organizacyjny\n\n" +
      "KIEDY UZNAC ZA ZROBIONE\n" +
      "- masz decyzje i zarys tras\n" +
      "- wiesz ilu gosci dotyczy transport\n\n" +
      "WSKAZOWKI\n" +
      "- dolicz bufory czasowe\n" +
      "- sprawdz doplaty za postoje i dodatkowe kilometry",
  },
  {
    key: "vendors_accommodation_block",
    title: "Usługodawcy: noclegi dla gości – zrób blok rezerwacji (jeśli potrzebne)",
    module: "vendors",
    category: "LOGISTYKA",
    offsetDays: -212,
    ceremonyScope: "ANY",
    description:
      "CO I PO CO\n" +
      "Blok rezerwacji ulatwia noclegi gosciom i zabezpiecza miejsca w okolicy.\n\n" +
      "JAK TO ZROBIC\n" +
      "- oszacuj ilu gosci potrzebuje noclegu\n" +
      "- wybierz 1-3 obiekty blisko miejsca przyjecia\n" +
      "- zapytaj o blok rezerwacji i warunki anulacji\n" +
      "- zapisz kontakt, termin zwolnienia puli i ceny\n\n" +
      "KIEDY UZNAC ZA ZROBIONE\n" +
      "- masz wybrane obiekty i warunki\n" +
      "- znasz termin zwolnienia puli miejsc\n\n" +
      "WSKAZOWKI\n" +
      "- najwazniejsze sa warunki anulacji\n" +
      "- miej opcje budzetowa i opcje blisko sali",
  },

  // 6–3 mies
  {
    key: "vendors_finalize_contracts_deposits",
    title: "Usługodawcy: finalizacja listy (umowy / zaliczki / terminy płatności)",
    module: "vendors",
    category: "USLUGI",
    offsetDays: -170,
    ceremonyScope: "ANY",
    description:
      "CO I PO CO\n" +
      "Umowy i zaliczki zabezpieczaja termin oraz zakres uslug.\n\n" +
      "JAK TO ZROBIC\n" +
      "- sprawdz czy masz komplet umow dla kluczowych uslug\n" +
      "- zapisz zaliczki i terminy platnosci\n" +
      "- dodaj notatki o zakresie uslug i warunkach anulacji\n" +
      "- upewnij sie ze masz kontakty do wszystkich\n\n" +
      "KIEDY UZNAC ZA ZROBIONE\n" +
      "- kluczowi uslugodawcy sa potwierdzeni\n" +
      "- terminy platnosci sa zapisane\n\n" +
      "WSKAZOWKI\n" +
      "- zapisuj co jest w cenie, a co jest doplata\n" +
      "- trzymaj dokumenty w jednym miejscu (Dokumenty lub notatki)",
  },
  {
    key: "fin_payment_schedule",
    title: "Finanse: przygotuj harmonogram płatności (planowane → w trakcie)",
    module: "finance",
    category: "ORGANIZACJA",
    offsetDays: -162,
    ceremonyScope: "ANY",
    description:
      "CO I PO CO\n" +
      "Harmonogram platnosci pozwala kontrolowac przeplyw pieniedzy i unikac kumulacji oplat.\n\n" +
      "JAK TO ZROBIC\n" +
      "- dla kazdego wydatku wpisz termin platnosci\n" +
      "- oznacz status Planowane lub W trakcie\n" +
      "- dopisz czy to zaliczka, rata czy doplata\n" +
      "- ustaw powiazane zadania przypominajace (jesli uzywasz)\n\n" +
      "KIEDY UZNAC ZA ZROBIONE\n" +
      "- masz terminy platnosci dla glownych kosztow\n" +
      "- wiesz co i kiedy trzeba zaplacic\n\n" +
      "WSKAZOWKI\n" +
      "- jesli kwota nieznana, wpisz widełki i dopisz notatke\n" +
      "- zachowaj margines gotowki na tydzien przed wydarzeniem",
  },
  {
    key: "guests_seating_notes",
    title: "Goście: zrób wstępny plan układu/stołów (lista + notatki)",
    module: "guests",
    category: "ORGANIZACJA",
    offsetDays: -154,
    ceremonyScope: "ANY",
    description:
      "CO I PO CO\n" +
      "Notatki o usadzeniu zapobiegaja problemom i przyspieszaja finalne decyzje.\n\n" +
      "JAK TO ZROBIC\n" +
      "- pogrupuj gosci (rodzina, przyjaciele, praca)\n" +
      "- dopisz kto z kim powinien siedziec\n" +
      "- dopisz uwagi o konfliktach i osobach starszych\n" +
      "- zapisz VIP, ktorzy powinni byc blisko pary\n\n" +
      "KIEDY UZNAC ZA ZROBIONE\n" +
      "- masz grupy i kluczowe uwagi\n" +
      "- VIP i ograniczenia sa zapisane\n\n" +
      "WSKAZOWKI\n" +
      "- nie musisz miec idealnego planu, chodzi o wczesne uwagi\n" +
      "- dopisz info o dzieciach, to czesto zmienia uklady",
  },
  {
    key: "vendors_music_tech_plan",
    title: "Usługodawcy: plan muzyczny i ustalenia techniczne (mikrofon, wejścia, przerwy)",
    module: "vendors",
    category: "USLUGI",
    offsetDays: -146,
    ceremonyScope: "ANY",
    description:
      "CO I PO CO\n" +
      "Ustalenia techniczne zapobiegaja problemom w dniu wydarzenia i doplatom za sprzet.\n\n" +
      "JAK TO ZROBIC\n" +
      "- ustal czy ma byc mikrofon i kto go zapewnia\n" +
      "- ustal przerwy, godziny grania i ewentualne przedluzenie\n" +
      "- ustal momenty specjalne (wejscie, pierwszy taniec, podziekowania)\n" +
      "- zapisz to w notatkach uslugodawcy\n\n" +
      "KIEDY UZNAC ZA ZROBIONE\n" +
      "- sa ustalone kluczowe momenty i wymagania\n" +
      "- wiesz co jest po stronie DJ/zespolu, a co po stronie sali\n\n" +
      "WSKAZOWKI\n" +
      "- dopytaj o awaryjny plan na problemy ze sprzetem\n" +
      "- dopisz gdzie ma stac stanowisko muzyki",
  },
  {
    key: "vendors_rings_choice",
    title: "Usługodawcy: wybór obrączek",
    module: "vendors",
    category: "USLUGI",
    offsetDays: -138,
    ceremonyScope: "ANY",
    description:
      "CO I PO CO\n" +
      "Obraczki wymagaja czasu na wybor rozmiaru i ewentualne wykonanie na zamowienie.\n\n" +
      "JAK TO ZROBIC\n" +
      "- ustal budzet i preferencje (kolor zlota, profil, kamienie)\n" +
      "- zmierz rozmiary w salonie\n" +
      "- sprawdz czas realizacji i warunki reklamacji\n" +
      "- zapisz informacje i termin odbioru\n\n" +
      "KIEDY UZNAC ZA ZROBIONE\n" +
      "- obraczki sa zamowione lub kupione\n" +
      "- znasz termin odbioru\n\n" +
      "WSKAZOWKI\n" +
      "- rozmiar palca moze sie zmieniac, mierz w podobnych warunkach\n" +
      "- zapisz kto przechowuje obraczki do dnia uroczystosci",
  },
  {
    key: "vendors_engagement_session",
    title: "Usługodawcy: sesja narzeczeńska (jeśli robicie)",
    module: "vendors",
    category: "USLUGI",
    offsetDays: -130,
    ceremonyScope: "ANY",
    description:
      "CO I PO CO\n" +
      "Sesja narzeczenska pomaga oswoic sie z aparatem i miec material na dodatki (zaproszenia, strona).\n\n" +
      "JAK TO ZROBIC\n" +
      "- ustal styl i lokalizacje\n" +
      "- wybierz termin i czas trwania\n" +
      "- ustal co ubieracie i czy potrzebne sa rekwizyty\n" +
      "- zapisz termin i ustalenia\n\n" +
      "KIEDY UZNAC ZA ZROBIONE\n" +
      "- termin sesji jest umowiony\n" +
      "- znasz lokalizacje i plan\n\n" +
      "WSKAZOWKI\n" +
      "- wybierz miejsce bez tlumow\n" +
      "- dopisz plan B na pogode",
  },
  {
    key: "wd_logistics_plan",
    title: "Dzień ślubu: ustal logistykę dnia (dojazdy, godziny, punkty krytyczne)",
    module: "weddingDay",
    category: "LOGISTYKA",
    offsetDays: -122,
    ceremonyScope: "ANY",
    description:
      "CO I PO CO\n" +
      "Logistyka zmniejsza ryzyko spoznien i chaosu. To mapa przejsc miedzy miejscami.\n\n" +
      "JAK TO ZROBIC\n" +
      "- ustal czasy dojazdow i dodaj bufory\n" +
      "- zapisz kto jedzie z kim i co przewozi\n" +
      "- oznacz punkty krytyczne (dokumenty, obraczki, platnosci)\n" +
      "- wpisz to do harmonogramu dnia\n\n" +
      "KIEDY UZNAC ZA ZROBIONE\n" +
      "- trasy i czasy sa zapisane\n" +
      "- punkty krytyczne sa oznaczone\n\n" +
      "WSKAZOWKI\n" +
      "- bufor 15-30 minut na kazdy dojazd zwykle ratuje plan\n" +
      "- miej kontakt do osoby od transportu pod reka",
  },

  // 3–1 mies
  {
    key: "vendors_confirmations",
    title: "Usługodawcy: potwierdź ustalenia (godziny, kontakt, dojazd)",
    module: "vendors",
    category: "USLUGI",
    offsetDays: -80,
    ceremonyScope: "ANY",
    description:
      "CO I PO CO\n" +
      "Potwierdzenia zmniejszaja ryzyko nieporozumien i bledow w godzinach oraz dojazdach.\n\n" +
      "JAK TO ZROBIC\n" +
      "- skontaktuj sie z kazdym uslugodawca\n" +
      "- potwierdz godziny przyjazdu, montazu i startu uslugi\n" +
      "- potwierdz adresy, parking i kontakt w dniu\n" +
      "- dopisz uwagi do kazdego uslugodawcy\n\n" +
      "KIEDY UZNAC ZA ZROBIONE\n" +
      "- kazdy uslugodawca ma potwierdzone godziny i kontakt\n" +
      "- masz zapisane informacje o dojezdzie\n\n" +
      "WSKAZOWKI\n" +
      "- popros o potwierdzenie na sms lub mail jesli lubisz porzadek\n" +
      "- sprawdz czy sa wymagania co do dostepu do pradu i miejsca",
  },
  {
    key: "wd_skeleton",
    title: "Dzień ślubu: ułóż wstępny harmonogram dnia",
    module: "weddingDay",
    category: "DZIEN_SLUBU",
    offsetDays: -72,
    ceremonyScope: "ANY",
    description:
      "CO I PO CO\n" +
      "Harmonogram jest szkieletem dnia. Ulatwia wspolprace z uslugodawcami i zmniejsza stres.\n\n" +
      "JAK TO ZROBIC\n" +
      "- wpisz godziny: przygotowania, ceremonia, dojazdy, przyjecie\n" +
      "- dodaj posilki i kluczowe momenty (pierwszy taniec, tort)\n" +
      "- dodaj bufory miedzy punktami\n" +
      "- zapisz harmonogram w module Dzien slubu\n\n" +
      "KIEDY UZNAC ZA ZROBIONE\n" +
      "- sa wszystkie glowne punkty\n" +
      "- kazdy punkt ma orientacyjna godzine\n\n" +
      "WSKAZOWKI\n" +
      "- prosto jest lepiej niz perfekcyjnie\n" +
      "- bufor to najlepsza rzecz w planie",
  },
  {
    key: "wd_packlist_checklist",
    title: "Dzień ślubu: przygotuj checklistę rzeczy do zabrania (dokumenty/obrączki/płatności/awaryjne)",
    module: "weddingDay",
    category: "LOGISTYKA",
    offsetDays: -64,
    ceremonyScope: "ANY",
    description:
      "CO I PO CO\n" +
      "Lista rzeczy zapobiega sytuacji, ze czegos krytycznego zabraknie w dniu uroczystosci.\n\n" +
      "JAK TO ZROBIC\n" +
      "- wypisz dokumenty, obraczki, potwierdzenia platnosci\n" +
      "- dopisz drobiazgi awaryjne (leki, igla i nitka, plastry)\n" +
      "- dopisz rzeczy do transportu (dekoracje, dodatki)\n" +
      "- ustal kto pakuje i kto przewozi\n\n" +
      "KIEDY UZNAC ZA ZROBIONE\n" +
      "- lista jest zapisana\n" +
      "- przypisales kto odpowiada za przewoz\n\n" +
      "WSKAZOWKI\n" +
      "- pakuj wczesniej i tylko dopisuj poprawki\n" +
      "- nie zostawiaj obraczek na ostatnia chwile",
  },
  {
    key: "vendors_hair_makeup_trial",
    title: "Usługodawcy: test fryzury/makijażu (jeśli dotyczy)",
    module: "vendors",
    category: "USLUGI",
    offsetDays: -56,
    ceremonyScope: "ANY",
    description:
      "CO I PO CO\n" +
      "Test pozwala dopracowac efekt i uniknac zaskoczen w dniu uroczystosci.\n\n" +
      "JAK TO ZROBIC\n" +
      "- umow termin testu\n" +
      "- przygotuj inspiracje i oczekiwania\n" +
      "- sprawdz trwałość i komfort\n" +
      "- zapisz poprawki i potwierdz plan na dzien slubu\n\n" +
      "KIEDY UZNAC ZA ZROBIONE\n" +
      "- test jest wykonany\n" +
      "- masz ustalenia co do stylu i czasu\n\n" +
      "WSKAZOWKI\n" +
      "- zrob zdjecia w naturalnym swietle\n" +
      "- jesli cos przeszkadza, powiedz od razu, to normalne",
  },
  {
    key: "vendors_outfits_finalize",
    title: "Usługodawcy: finalne dopięcie strojów (ostatnie poprawki)",
    module: "vendors",
    category: "USLUGI",
    offsetDays: -48,
    ceremonyScope: "ANY",
    description:
      "CO I PO CO\n" +
      "Ostatnie poprawki gwarantuja wygode i pewnosc w dniu uroczystosci.\n\n" +
      "JAK TO ZROBIC\n" +
      "- umow finalna przymiarke\n" +
      "- sprawdz dlugosc, dopasowanie i komfort ruchu\n" +
      "- dopnij dodatki (buty, bielizna, koszula, krawat)\n" +
      "- zapisz termin odbioru i kto odbiera\n\n" +
      "KIEDY UZNAC ZA ZROBIONE\n" +
      "- stroje sa dopasowane i gotowe\n" +
      "- znasz termin odbioru\n\n" +
      "WSKAZOWKI\n" +
      "- przymierz caly zestaw razem, nie tylko pojedyncze elementy\n" +
      "- sprawdz czy buty sa rozchodzone",
  },
  {
    key: "wd_plan_b",
    title: "Dzień ślubu: plan „co jeśli” (opóźnienia, pogoda, awaryjne numery)",
    module: "weddingDay",
    category: "LOGISTYKA",
    offsetDays: -40,
    ceremonyScope: "ANY",
    description:
      "CO I PO CO\n" +
      "Plan awaryjny zmniejsza panike gdy cos sie przesunie lub zepsuje.\n\n" +
      "JAK TO ZROBIC\n" +
      "- wypisz ryzyka: pogoda, korki, opoznienia\n" +
      "- ustal decyzje awaryjne (plan B lokalizacji, plan B dojazdu)\n" +
      "- zbierz awaryjne numery (kierowca, sala, DJ, fotograf)\n" +
      "- zapisz kto podejmuje decyzje w kryzysie\n\n" +
      "KIEDY UZNAC ZA ZROBIONE\n" +
      "- masz liste ryzyk i rozwiazan\n" +
      "- masz liste kontaktow awaryjnych\n\n" +
      "WSKAZOWKI\n" +
      "- proste rozwiazania dzialaja najlepiej\n" +
      "- nie przesadzaj, chodzi o kilka realnych scenariuszy",
  },

  // 30–7 dni
  {
    key: "guests_final_count_menu_allergens",
    title: "Goście: potwierdź liczbę gości / menu / alergie (uzupełnij allergens)",
    module: "guests",
    category: "ORGANIZACJA",
    offsetDays: -26,
    ceremonyScope: "ANY",
    description:
      "CO I PO CO\n" +
      "To jest moment na zamkniecie listy i potwierdzenie potrzeb dietetycznych.\n\n" +
      "JAK TO ZROBIC\n" +
      "- przejrzyj RSVP i dopytaj osoby z nieznanym statusem\n" +
      "- upewnij sie co do alergii i diet\n" +
      "- zaktualizuj liczbe osob dla sali i cateringu\n" +
      "- zapisz ustalenia w gosciach i notatkach\n\n" +
      "KIEDY UZNAC ZA ZROBIONE\n" +
      "- masz finalna liczbe gosci\n" +
      "- alergie i diety sa uzupelnione\n\n" +
      "WSKAZOWKI\n" +
      "- zostaw minimalny margines na zmiany last minute\n" +
      "- zaznacz osoby, ktore moga sie wycofac",
  },
  {
    key: "wd_roles_responsibilities",
    title: "Dzień ślubu: rozpisz kto za co odpowiada (kontakty + zadania)",
    module: "weddingDay",
    category: "LOGISTYKA",
    offsetDays: -20,
    ceremonyScope: "ANY",
    description:
      "CO I PO CO\n" +
      "Rozpiska odpowiedzialnosci odciaza pare mloda i zapobiega chaosowi.\n\n" +
      "JAK TO ZROBIC\n" +
      "- ustal kto odbiera rzeczy i kto pilnuje platnosci\n" +
      "- ustal kto prowadzi kontakt z uslugodawcami\n" +
      "- dopisz role dla swiadkow i bliskich\n" +
      "- zapisz to w kontaktach dnia i zadaniach\n\n" +
      "KIEDY UZNAC ZA ZROBIONE\n" +
      "- kazdy obszar ma przypisana osobe\n" +
      "- kontakty sa zapisane w systemie\n\n" +
      "WSKAZOWKI\n" +
      "- jedna osoba od kontaktu to mniej zamieszania\n" +
      "- upewnij sie ze osoby wiedza o swoich rolach",
  },
  {
    key: "fin_settlement_plan",
    title: "Finanse: zaplanuj rozliczenia (kto płaci komu i kiedy)",
    module: "finance",
    category: "ORGANIZACJA",
    offsetDays: -16,
    ceremonyScope: "ANY",
    description:
      "CO I PO CO\n" +
      "Plan rozliczen zapobiega sytuacji, ze w dniu slubu ktos szuka gotowki i nie wie co zaplacic.\n\n" +
      "JAK TO ZROBIC\n" +
      "- wypisz kto i kiedy placi (zaliczki, doplaty, gotowka)\n" +
      "- ustal forme platnosci dla kazdego uslugodawcy\n" +
      "- przygotuj potwierdzenia lub faktury\n" +
      "- zapisz informacje w Finansach i notatkach\n\n" +
      "KIEDY UZNAC ZA ZROBIONE\n" +
      "- masz rozpisane platnosci i terminy\n" +
      "- wiesz kto ma gotowke i kto wykonuje przelewy\n\n" +
      "WSKAZOWKI\n" +
      "- nie trzymaj calej odpowiedzialnosci na jednej osobie bez planu\n" +
      "- potwierdz czy sala wymaga platnosci przed czy po wydarzeniu",
  },
  {
    key: "vendors_pickups_plan",
    title: "Usługodawcy: zaplanuj odbiory (stroje/dekoracje/dodatki/napoje jeśli we własnym zakresie)",
    module: "vendors",
    category: "LOGISTYKA",
    offsetDays: -12,
    ceremonyScope: "ANY",
    description:
      "CO I PO CO\n" +
      "Odbiory i dowozy to czesta przyczyna stresu. Plan z wyprzedzeniem to spokoj.\n\n" +
      "JAK TO ZROBIC\n" +
      "- wypisz co trzeba odebrac i skad\n" +
      "- ustal kto odbiera i o ktorej godzinie\n" +
      "- sprawdz czy potrzebny jest samochod lub pomoc w noszeniu\n" +
      "- zapisz plan w notatkach i kontaktach dnia\n\n" +
      "KIEDY UZNAC ZA ZROBIONE\n" +
      "- masz liste odbiorow z osobami odpowiedzialnymi\n" +
      "- znasz godziny i miejsca odbioru\n\n" +
      "WSKAZOWKI\n" +
      "- nie planuj odbiorow na ostatnia chwile\n" +
      "- dodaj plan B gdyby cos sie opoznilo",
  },
  {
    key: "fin_envelopes_cash_buffer",
    title: "Finanse: przygotuj koperty/rozliczenia + gotówkę awaryjną",
    module: "finance",
    category: "ORGANIZACJA",
    offsetDays: -9,
    ceremonyScope: "ANY",
    description:
      "CO I PO CO\n" +
      "Gotowka awaryjna i koperty przyspieszaja rozliczenia i ratuja gdy cos trzeba doplacic na miejscu.\n\n" +
      "JAK TO ZROBIC\n" +
      "- przygotuj koperty opisane nazwami uslugodawcow\n" +
      "- przygotuj gotowke awaryjna\n" +
      "- dopisz kto przechowuje gotowke i kto wydaje\n" +
      "- zapisz kwoty i przeznaczenie w notatkach\n\n" +
      "KIEDY UZNAC ZA ZROBIONE\n" +
      "- koperty i gotowka sa przygotowane\n" +
      "- osoba odpowiedzialna jest ustalona\n\n" +
      "WSKAZOWKI\n" +
      "- przechowuj gotowke bezpiecznie, nie w wielu miejscach\n" +
      "- nie zostawiaj tego na dzien przed",
  },

  // 7–1 dzien
  {
    key: "vendors_hour_by_hour_confirm",
    title: "Usługodawcy: potwierdź „godzina po godzinie” z muzyką/salą/foto",
    module: "vendors",
    category: "USLUGI",
    offsetDays: -6,
    ceremonyScope: "ANY",
    description:
      "CO I PO CO\n" +
      "Ostatnie potwierdzenie godzin zmniejsza ryzyko bledow w dniu uroczystosci.\n\n" +
      "JAK TO ZROBIC\n" +
      "- przejdz z kazdym uslugodawca plan godzinowy\n" +
      "- potwierdz przyjazd, montaz i start\n" +
      "- potwierdz kontakt do osoby na miejscu\n" +
      "- dopisz ostatnie uwagi do notatek\n\n" +
      "KIEDY UZNAC ZA ZROBIONE\n" +
      "- kluczowi uslugodawcy potwierdzili godziny\n" +
      "- masz kontakty dzialajace w dniu\n\n" +
      "WSKAZOWKI\n" +
      "- najlepiej potwierdzic krotko i konkretnie\n" +
      "- jesli cos sie zmienilo, popraw harmonogram dnia",
  },
  {
    key: "wd_day_kit_pack",
    title: "Dzień ślubu: spakuj zestaw dnia (dokumenty, obrączki, kosmetyki, leki, igła/nitka, powerbank)",
    module: "weddingDay",
    category: "LOGISTYKA",
    offsetDays: -5,
    ceremonyScope: "ANY",
    description:
      "CO I PO CO\n" +
      "Zestaw dnia pozwala rozwiazac drobne problemy bez szukania i stresu.\n\n" +
      "JAK TO ZROBIC\n" +
      "- spakuj dokumenty i obraczki do bezpiecznego miejsca\n" +
      "- spakuj kosmetyki, leki, plastry, igle i nitke\n" +
      "- dodaj powerbank i ladowarke\n" +
      "- ustal kto przewozi zestaw\n\n" +
      "KIEDY UZNAC ZA ZROBIONE\n" +
      "- zestaw jest spakowany\n" +
      "- jest ustalona osoba odpowiedzialna za przewoz\n\n" +
      "WSKAZOWKI\n" +
      "- nie rozdzielaj obraczek i dokumentow na rozne osoby bez planu\n" +
      "- trzymaj zestaw pod reka, a nie w bagazniku bez dostepu",
  },
  {
    key: "wd_contacts_coordinator",
    title: "Dzień ślubu: przygotuj numery do usługodawców + wyznacz koordynatora kontaktu",
    module: "weddingDay",
    category: "LOGISTYKA",
    offsetDays: -4,
    ceremonyScope: "ANY",
    description:
      "CO I PO CO\n" +
      "Dobre kontakty i jedna osoba od komunikacji oszczedzaja stres i czas.\n\n" +
      "JAK TO ZROBIC\n" +
      "- zbierz numery do sali, DJ, fotografa, transportu\n" +
      "- zapisz je w szybkim dostepie w module Dzien slubu\n" +
      "- wyznacz koordynatora kontaktu\n" +
      "- poinformuj uslugodawcow kto jest kontaktem w dniu\n\n" +
      "KIEDY UZNAC ZA ZROBIONE\n" +
      "- kontakty sa zapisane i sprawdzone\n" +
      "- koordynator jest wyznaczony\n\n" +
      "WSKAZOWKI\n" +
      "- zrob szybki test polaczenia lub wiadomosci\n" +
      "- niech koordynator ma tez Twoj plan dnia",
  },
  {
    key: "vendors_bouquet_decor_pickup",
    title: "Usługodawcy: odbiór bukietu/dekoracji (jeśli dzień wcześniej)",
    module: "vendors",
    category: "LOGISTYKA",
    offsetDays: -3,
    ceremonyScope: "ANY",
    description:
      "CO I PO CO\n" +
      "Odbior bukietu i dekoracji dzien wczesniej zmniejsza stres w dniu uroczystosci.\n\n" +
      "JAK TO ZROBIC\n" +
      "- potwierdz godzine i miejsce odbioru\n" +
      "- ustal kto odbiera i jak przewozi (bez uszkodzenia)\n" +
      "- sprawdz czy potrzebne jest chlodne miejsce\n" +
      "- zapisz plan i kontakt do florysty\n\n" +
      "KIEDY UZNAC ZA ZROBIONE\n" +
      "- odbior jest zaplanowany lub wykonany\n" +
      "- osoba odpowiedzialna jest ustalona\n\n" +
      "WSKAZOWKI\n" +
      "- unikaj zostawiania kwiatow w cieplym aucie\n" +
      "- dopisz plan B gdyby florysta sie opoznil",
  },
  {
    key: "wd_rest_no_new_things",
    title: "Dzień ślubu: odpoczynek/sen + „zakaz dokładania rzeczy”",
    module: "weddingDay",
    category: "LOGISTYKA",
    offsetDays: -2,
    ceremonyScope: "ANY",
    description:
      "CO I PO CO\n" +
      "Odpoczynek poprawia samopoczucie i zmniejsza ryzyko chaosu w ostatniej chwili.\n\n" +
      "JAK TO ZROBIC\n" +
      "- zakoncz zmiany w planie na 1-2 dni przed\n" +
      "- przygotuj rzeczy wieczorem i nie dokladaj nowych zadan\n" +
      "- zaplanuj spokojny wieczor i sen\n\n" +
      "KIEDY UZNAC ZA ZROBIONE\n" +
      "- nie dodajesz nowych spraw na ostatnia chwile\n" +
      "- masz przygotowane rzeczy na rano\n\n" +
      "WSKAZOWKI\n" +
      "- jesli cos jest niekrytyczne, odpusc\n" +
      "- spokoj jest wart wiecej niz dopinanie detali",
  },

  // dzien 0
  {
    key: "wd_take_key_items",
    title: "Dzień ślubu: odbiór/transport kluczowych elementów (obrączki/dokumenty)",
    module: "weddingDay",
    category: "LOGISTYKA",
    offsetDays: 0,
    ceremonyScope: "ANY",
    description:
      "CO I PO CO\n" +
      "Kluczowe elementy musza byc z Toba na czas. To czesto jedyna rzecz, ktorej nie da sie szybko naprawic.\n\n" +
      "JAK TO ZROBIC\n" +
      "- sprawdz czy obraczki i dokumenty sa na miejscu\n" +
      "- upewnij sie kto je przewozi\n" +
      "- miej je w bezpiecznym i latwo dostepnym miejscu\n\n" +
      "KIEDY UZNAC ZA ZROBIONE\n" +
      "- obraczki i dokumenty sa z Toba lub u wyznaczonej osoby\n" +
      "- wiesz gdzie sa w danym momencie\n\n" +
      "WSKAZOWKI\n" +
      "- nie przekladaj odpowiedzialnosci w ostatniej chwili\n" +
      "- trzymaj to przy sobie lub u jednej zaufanej osoby",
  },
  {
    key: "wd_checkin_vendors",
    title: "Dzień ślubu: check-in z usługodawcami (kontakt + potwierdzenie startu)",
    module: "weddingDay",
    category: "USLUGI",
    offsetDays: 0,
    ceremonyScope: "ANY",
    description:
      "CO I PO CO\n" +
      "Szybki check-in potwierdza, ze wszyscy dojechali i dzialaja zgodnie z planem.\n\n" +
      "JAK TO ZROBIC\n" +
      "- koordynator kontaktu dzwoni lub pisze do kluczowych uslugodawcow\n" +
      "- potwierdza start, miejsce i ewentualne zmiany\n" +
      "- w razie problemu uruchamia plan B\n\n" +
      "KIEDY UZNAC ZA ZROBIONE\n" +
      "- kluczowi uslugodawcy potwierdzili obecnosc\n" +
      "- ewentualne problemy sa przejete przez koordynatora\n\n" +
      "WSKAZOWKI\n" +
      "- para mloda niech nie zajmuje sie telefonami\n" +
      "- trzymaj komunikacje krotka i konkretna",
  },
  {
    key: "wd_execute_with_buffers",
    title: "Dzień ślubu: realizacja wg planu + bufory czasowe",
    module: "weddingDay",
    category: "DZIEN_SLUBU",
    offsetDays: 0,
    ceremonyScope: "ANY",
    description:
      "CO I PO CO\n" +
      "Trzymanie planu z buforami zmniejsza spiecia czasowe i pozwala cieszyc sie dniem.\n\n" +
      "JAK TO ZROBIC\n" +
      "- realizuj punkty harmonogramu w kolejnosci\n" +
      "- jesli cos sie opoznia, tnij detale, nie kluczowe punkty\n" +
      "- koordynator pilnuje czasu i komunikacji\n\n" +
      "KIEDY UZNAC ZA ZROBIONE\n" +
      "- dzien przebiega zgodnie z glownymi punktami\n" +
      "- opoznienia sa opanowane bez chaosu\n\n" +
      "WSKAZOWKI\n" +
      "- bufory sa po to, zeby z nich korzystac\n" +
      "- nie gon planu kosztem stresu",
  },
  {
    key: "fin_day_settlements",
    title: "Finanse: rozliczenia w dniu (jeśli są) + zabezpieczenie rzeczy/odbiorów",
    module: "finance",
    category: "ORGANIZACJA",
    offsetDays: 0,
    ceremonyScope: "ANY",
    description:
      "CO I PO CO\n" +
      "Rozliczenia w dniu powinny byc proste i zaplanowane, zeby nie odciagaly uwagi.\n\n" +
      "JAK TO ZROBIC\n" +
      "- koordynator lub wyznaczona osoba realizuje platnosci\n" +
      "- korzysta z kopert i rozpiski rozliczen\n" +
      "- pilnuje potwierdzen i odbioru rzeczy\n\n" +
      "KIEDY UZNAC ZA ZROBIONE\n" +
      "- platnosci zaplanowane na dzien sa wykonane\n" +
      "- rzeczy sa zabezpieczone i odebrane zgodnie z planem\n\n" +
      "WSKAZOWKI\n" +
      "- niech para mloda nie robi platnosci\n" +
      "- trzymaj potwierdzenia w jednym miejscu",
  },

  // po uroczystosci
  {
    key: "vendors_returns_rentals",
    title: "Usługodawcy: zwroty wypożyczeń (stroje/dekoracje)",
    module: "vendors",
    category: "LOGISTYKA",
    offsetDays: 5,
    ceremonyScope: "ANY",
    description:
      "CO I PO CO\n" +
      "Zwroty wypozyczen chronia przed doplatami i karami za opoznienie.\n\n" +
      "JAK TO ZROBIC\n" +
      "- wypisz co jest wypozyczone i do kiedy trzeba oddac\n" +
      "- ustal kto odpowiada za zwrot\n" +
      "- sprawdz stan rzeczy przed oddaniem\n\n" +
      "KIEDY UZNAC ZA ZROBIONE\n" +
      "- wszystkie wypozyczone rzeczy sa oddane\n" +
      "- masz potwierdzenie zwrotu jesli jest\n\n" +
      "WSKAZOWKI\n" +
      "- zrob szybkie zdjecia stanu przed zwrotem\n" +
      "- zapisz termin zwrotu od razu po odebraniu rzeczy",
  },
  {
    key: "guests_thank_you",
    title: "Goście: podziękowania (wiadomości/karteczki)",
    module: "guests",
    category: "ORGANIZACJA",
    offsetDays: 9,
    ceremonyScope: "ANY",
    description:
      "CO I PO CO\n" +
      "Podziekowania domykaja wydarzenie i buduja dobre relacje.\n\n" +
      "JAK TO ZROBIC\n" +
      "- przygotuj krotka wiadomosc dla gosci\n" +
      "- wyslij do najblizszych lub do wszystkich\n" +
      "- jesli byly prezenty, mozna dopisac podziekowanie osobiste\n\n" +
      "KIEDY UZNAC ZA ZROBIONE\n" +
      "- wyslales podziekowania\n" +
      "- najwazniejsze osoby zostaly uwzglednione\n\n" +
      "WSKAZOWKI\n" +
      "- prosto i szczerze wystarczy\n" +
      "- nie odkladaj tego na miesiace",
  },
  {
    key: "fin_settle_vendors_invoices",
    title: "Finanse: rozlicz usługodawców + zbierz faktury/rachunki (status: opłacone)",
    module: "finance",
    category: "ORGANIZACJA",
    offsetDays: 14,
    ceremonyScope: "ANY",
    description:
      "CO I PO CO\n" +
      "Rozliczenia domykaja budzet i porzadkuja dokumenty. Latwiej potem zrobic podsumowanie.\n\n" +
      "JAK TO ZROBIC\n" +
      "- sprawdz listę niezaplaconych doplat\n" +
      "- zaplac i ustaw status Opłacone\n" +
      "- zbierz faktury i rachunki oraz dopisz do notatek\n\n" +
      "KIEDY UZNAC ZA ZROBIONE\n" +
      "- wszystkie platnosci sa zamkniete\n" +
      "- dokumenty rozliczen sa zebrane\n\n" +
      "WSKAZOWKI\n" +
      "- trzymaj rozliczenia w jednym miejscu\n" +
      "- dopisz co bylo doplata i dlaczego, to pomaga w analizie",
  },
  {
    key: "vendors_photos_video_delivery",
    title: "Usługodawcy: odbiór zdjęć/filmu – selekcja, akcept, album",
    module: "vendors",
    category: "USLUGI",
    offsetDays: 21,
    ceremonyScope: "ANY",
    description:
      "CO I PO CO\n" +
      "Ustalenie odbioru materialu pomaga dopilnowac terminow i dopracowac efekt koncowy.\n\n" +
      "JAK TO ZROBIC\n" +
      "- sprawdz termin oddania materialu z umowy\n" +
      "- wybierz zdjecia do albumu jesli dotyczy\n" +
      "- zaakceptuj material lub zglos poprawki w ustalonym zakresie\n\n" +
      "KIEDY UZNAC ZA ZROBIONE\n" +
      "- material jest odebrany\n" +
      "- selekcja i akcept sa wykonane (jesli dotyczy)\n\n" +
      "WSKAZOWKI\n" +
      "- trzymaj komunikacje z fotografem w jednym watku\n" +
      "- zapisz hasla i linki w notatkach",
  },

  // ============================================================
  // B) TYLKO CYWILNY
  // ============================================================
  {
    key: "formalities_civil_choose_usc",
    title: "Formalności (cywilny): wybierz USC/miejsce zawarcia + sprawdź terminy",
    module: "formalities",
    category: "FORMALNOSCI",
    offsetDays: -240,
    ceremonyScope: "CIVIL",
    description:
      "CO I PO CO\n" +
      "Wybor USC i terminu to podstawa formalnosci. Wczesniej latwiej znalezc pasujacy termin.\n\n" +
      "JAK TO ZROBIC\n" +
      "- sprawdz USC w okolicy lub miejsce plenerowe\n" +
      "- zapytaj o dostepne terminy\n" +
      "- sprawdz oplaty i wymagania\n" +
      "- zapisz decyzje i kontakt\n\n" +
      "KIEDY UZNAC ZA ZROBIONE\n" +
      "- miejsce i termin sa wybrane\n" +
      "- znasz podstawowe wymagania USC\n\n" +
      "WSKAZOWKI\n" +
      "- plener moze wymagac dodatkowej zgody\n" +
      "- dopytaj o terminy skladania dokumentow",
  },
  {
    key: "formalities_civil_requirements_check",
    title: "Formalności (cywilny): sprawdź wymagania USC (dokumenty, terminy, opłaty, tłumaczenia)",
    module: "formalities",
    category: "FORMALNOSCI",
    offsetDays: -232,
    ceremonyScope: "CIVIL",
    description:
      "CO I PO CO\n" +
      "Wymagania USC roznia sie. Wczesna weryfikacja zapobiega brakom na ostatnia chwile.\n\n" +
      "JAK TO ZROBIC\n" +
      "- sprawdz liste dokumentow i termin ich dostarczenia\n" +
      "- sprawdz oplaty i forme platnosci\n" +
      "- sprawdz czy potrzebne sa tlumaczenia lub dodatkowe zaswiadczenia\n" +
      "- zapisz liste w Dokumentach lub notatkach\n\n" +
      "KIEDY UZNAC ZA ZROBIONE\n" +
      "- masz komplet wymagan spisany\n" +
      "- wiesz jakie terminy obowiazuja\n\n" +
      "WSKAZOWKI\n" +
      "- zapisz nazwisko osoby z USC i numer telefonu\n" +
      "- nie zostawiaj formalnosci na ostatni miesiac",
  },
  {
    key: "formalities_usc_documents_bundle",
    title: "Formalności (cywilny): przygotuj pakiet dokumentów do USC (dowody, oświadczenia, opłaty, zaświadczenia)",
    module: "formalities",
    category: "FORMALNOSCI",
    offsetDays: -150,
    ceremonyScope: "CIVIL",
    description:
      "CO I PO CO\n" +
      "Komplet dokumentow pozwala sprawnie przejsc proces i uniknac odrzucenia wniosku.\n\n" +
      "JAK TO ZROBIC\n" +
      "- przygotuj dowody i wymagane oswiadczenia\n" +
      "- przygotuj potwierdzenia oplat\n" +
      "- jesli dotyczy, zalatw dodatkowe zaswiadczenia\n" +
      "- trzymaj wszystko w jednym miejscu\n\n" +
      "KIEDY UZNAC ZA ZROBIONE\n" +
      "- dokumenty sa zebrane i sprawdzone\n" +
      "- wiesz kiedy i gdzie je zlozyc\n\n" +
      "WSKAZOWKI\n" +
      "- zrob kopie lub skany na wszelki wypadek\n" +
      "- dopisz terminy waznosci zaswiadczen jesli maja",
  },
  {
    key: "formalities_civil_confirm_details",
    title: "Formalności (cywilny): potwierdź termin i szczegóły w USC (świadkowie, dane, miejsce, godzina)",
    module: "formalities",
    category: "FORMALNOSCI",
    offsetDays: -24,
    ceremonyScope: "CIVIL",
    description:
      "CO I PO CO\n" +
      "Potwierdzenie szczegolow zmniejsza ryzyko bledow w danych i nieporozumien co do miejsca.\n\n" +
      "JAK TO ZROBIC\n" +
      "- potwierdz godzine i miejsce ceremonii\n" +
      "- potwierdz dane swiadkow\n" +
      "- sprawdz co trzeba miec w dniu ceremonii\n" +
      "- zapisz potwierdzenie w notatkach\n\n" +
      "KIEDY UZNAC ZA ZROBIONE\n" +
      "- szczegoly sa potwierdzone\n" +
      "- swiadkowie wiedza kiedy i gdzie maja byc\n\n" +
      "WSKAZOWKI\n" +
      "- sprawdz dowody swiadkow wczesniej\n" +
      "- dopytaj o zasady spoznien i wejscia",
  },
  {
    key: "formalities_civil_what_to_take",
    title: "Formalności (cywilny): sprawdź co zabrać w dniu (dowody, potwierdzenia)",
    module: "formalities",
    category: "FORMALNOSCI",
    offsetDays: -12,
    ceremonyScope: "CIVIL",
    description:
      "CO I PO CO\n" +
      "Lista rzeczy do zabrania zmniejsza ryzyko, ze zabraknie dokumentu w dniu ceremonii.\n\n" +
      "JAK TO ZROBIC\n" +
      "- sprawdz wymagania USC\n" +
      "- przygotuj dowody i potwierdzenia\n" +
      "- wloz dokumenty do zestawu dnia\n\n" +
      "KIEDY UZNAC ZA ZROBIONE\n" +
      "- dokumenty sa przygotowane i spakowane\n" +
      "- osoba odpowiedzialna jest ustalona\n\n" +
      "WSKAZOWKI\n" +
      "- trzymaj dokumenty w jednym miejscu\n" +
      "- sprawdz waznosc dowodow",
  },
  {
    key: "formalities_civil_prepare_ids",
    title: "Formalności (cywilny): przygotuj dowody i komplet dokumentów do zabrania",
    module: "formalities",
    category: "FORMALNOSCI",
    offsetDays: -3,
    ceremonyScope: "CIVIL",
    description:
      "CO I PO CO\n" +
      "Ostatnie sprawdzenie dokumentow zmniejsza stres i ryzyko pomylki.\n\n" +
      "JAK TO ZROBIC\n" +
      "- sprawdz komplet dokumentow\n" +
      "- spakuj je do zestawu dnia\n" +
      "- potwierdz kto je bierze ze soba\n\n" +
      "KIEDY UZNAC ZA ZROBIONE\n" +
      "- dokumenty sa spakowane\n" +
      "- wiadomo kto je przewozi\n\n" +
      "WSKAZOWKI\n" +
      "- nie przekladaj dokumentow miedzy torbami\n" +
      "- trzymaj je w miejscu latwo dostepnym",
  },

  // ============================================================
  // C) TYLKO KOSCIELNY / KONKORDAT
  // ============================================================
  {
    key: "formalities_church_choose_parish",
    title: "Formalności (kościelny): wybierz parafię i termin + wstępna rezerwacja w kancelarii",
    module: "formalities",
    category: "FORMALNOSCI",
    offsetDays: -352,
    ceremonyScope: "CHURCH",
    description:
      "CO I PO CO\n" +
      "Parafia i termin wyznaczaja kalendarz formalnosci i dostepnosc.\n\n" +
      "JAK TO ZROBIC\n" +
      "- wybierz parafie i sprawdz dostepne terminy\n" +
      "- umow wstepna rezerwacje w kancelarii\n" +
      "- zapisz kontakt i ustalenia\n\n" +
      "KIEDY UZNAC ZA ZROBIONE\n" +
      "- termin jest wstepnie zarezerwowany\n" +
      "- masz kontakt do kancelarii\n\n" +
      "WSKAZOWKI\n" +
      "- dopytaj o liste dokumentow w Twojej parafii\n" +
      "- sprawdz czy sa ograniczenia co do godzin",
  },
  {
    key: "formalities_church_concordat_decision",
    title: "Formalności (kościelny): ustal czy to konkordat (ze skutkami cywilnymi)",
    module: "formalities",
    category: "FORMALNOSCI",
    offsetDays: -344,
    ceremonyScope: "CHURCH",
    description:
      "CO I PO CO\n" +
      "Konkordat zmienia liste dokumentow i kroki z USC.\n\n" +
      "JAK TO ZROBIC\n" +
      "- potwierdz z parafia czy ceremonia ma skutki cywilne\n" +
      "- zapisz jaka sciezka obowiazuje\n" +
      "- dopisz wymagane dokumenty do listy\n\n" +
      "KIEDY UZNAC ZA ZROBIONE\n" +
      "- masz jasna decyzje konkordat lub nie\n" +
      "- wiesz jakie dokumenty beda potrzebne\n\n" +
      "WSKAZOWKI\n" +
      "- nie zakladaj, ze wszedzie jest identycznie\n" +
      "- zapisz terminy waznosci zaswiadczen",
  },
  {
    key: "formalities_church_premarital_courses",
    title: "Formalności (kościelny): nauki przedmałżeńskie (terminy, zapisy)",
    module: "formalities",
    category: "FORMALNOSCI",
    offsetDays: -252,
    ceremonyScope: "CHURCH",
    description:
      "CO I PO CO\n" +
      "Nauki sa wymagane w wielu parafiach. Zajecia maja terminy i limity miejsc.\n\n" +
      "JAK TO ZROBIC\n" +
      "- sprawdz dostępne terminy nauk\n" +
      "- zapisz sie i zapisz daty spotkan\n" +
      "- dopisz wymagane potwierdzenia do dokumentow\n\n" +
      "KIEDY UZNAC ZA ZROBIONE\n" +
      "- jestes zapisany na nauki\n" +
      "- znasz harmonogram spotkan\n\n" +
      "WSKAZOWKI\n" +
      "- im wczesniej tym lepiej, miejsca potrafia sie skonczyc\n" +
      "- dopisz gdzie odbierzesz zaswiadczenie po naukach",
  },
  {
    key: "formalities_church_parish_meetings",
    title: "Formalności (kościelny): spotkania w kancelarii – start formalności i lista dokumentów parafii/diecezji",
    module: "formalities",
    category: "FORMALNOSCI",
    offsetDays: -244,
    ceremonyScope: "CHURCH",
    description:
      "CO I PO CO\n" +
      "Kancelaria podaje konkretna liste dokumentow i terminy dla Twojej parafii.\n\n" +
      "JAK TO ZROBIC\n" +
      "- umow spotkanie w kancelarii\n" +
      "- spisz liste dokumentow i terminow\n" +
      "- zapisz wymagania dotyczace swiadkow i zapowiedzi\n\n" +
      "KIEDY UZNAC ZA ZROBIONE\n" +
      "- masz spisana liste dokumentow\n" +
      "- wiesz jakie sa terminy i kroki\n\n" +
      "WSKAZOWKI\n" +
      "- popros o liste na pismie lub zrob notatke od razu\n" +
      "- dopisz czy parafia wymaga proby i kiedy",
  },
  {
  key: "formalities_church_protocol_banns",
  title: "Formalności (kościelny): protokół przedślubny i zapowiedzi",
  module: "formalities",
  category: "FORMALNOSCI",
  offsetDays: -130,
  ceremonyScope: "CHURCH",
  description:
    "CO I PO CO\n" +
    "Protokol przedslubny i zapowiedzi to formalne potwierdzenie zamiaru zawarcia malzenstwa w parafii.\n\n" +
    "JAK TO ZROBIC\n" +
    "- umow termin spisania protokolu w kancelarii\n" +
    "- przygotuj wymagane dokumenty (dowody, metryki)\n" +
    "- ustal gdzie maja byc wygloszone zapowiedzi\n" +
    "- zapisz daty i terminy w notatkach\n\n" +
    "KIEDY UZNAC ZA ZROBIONE\n" +
    "- protokol jest spisany\n" +
    "- zapowiedzi sa ustalone lub ogloszone\n\n" +
    "WSKAZOWKI\n" +
    "- kazda parafia ma troche inne zasady\n" +
    "- nie odkładaj tego na ostatnia chwile",
},
{
  key: "formalities_church_documents_bundle",
  title: "Formalności (kościelny): przygotuj dokumenty kościelne",
  module: "formalities",
  category: "FORMALNOSCI",
  offsetDays: -118,
  ceremonyScope: "CHURCH",
  description:
    "CO I PO CO\n" +
    "Dokumenty koscielne sa wymagane do zawarcia slubu i musza byc aktualne.\n\n" +
    "JAK TO ZROBIC\n" +
    "- zbierz metryki chrztu i bierzmowania\n" +
    "- sprawdz czy dokumenty nie stracily waznosci\n" +
    "- zeskanuj je lub dodaj do modulu Dokumenty\n" +
    "- upewnij sie ze masz oryginaly na wszelki wypadek\n\n" +
    "KIEDY UZNAC ZA ZROBIONE\n" +
    "- wszystkie dokumenty sa zebrane\n" +
    "- dokumenty sa zapisane w systemie\n\n" +
    "WSKAZOWKI\n" +
    "- niektore dokumenty sa wazne tylko kilka miesiecy\n" +
    "- zapisz skad pochodzi kazdy dokument",
},
{
  key: "formalities_concordat_usc_certificate_path",
  title: "Formalności (konkordat): zalatw zaswiadczenie z USC",
  module: "formalities",
  category: "FORMALNOSCI",
  offsetDays: -105,
  ceremonyScope: "CHURCH",
  description:
    "CO I PO CO\n" +
    "Przy slubie konkordatowym USC musi wydac zaswiadczenie potrzebne parafii.\n\n" +
    "JAK TO ZROBIC\n" +
    "- sprawdz w parafii jakie zaswiadczenie jest wymagane\n" +
    "- umow wizyte w USC\n" +
    "- zloz wniosek o wydanie zaswiadczenia\n" +
    "- zapisz termin waznosci dokumentu\n\n" +
    "KIEDY UZNAC ZA ZROBIONE\n" +
    "- masz zaswiadczenie z USC\n" +
    "- dokument jest zapisany w Dokumentach\n\n" +
    "WSKAZOWKI\n" +
    "- zaswiadczenie ma ograniczona waznosc\n" +
    "- nie wyjmuj oryginalu z teczki bez potrzeby",
},
{
  key: "formalities_church_signatures_confession_rehearsal",
  title: "Formalności (kościelny): podpisy i proba ceremonii",
  module: "formalities",
  category: "FORMALNOSCI",
  offsetDays: -23,
  ceremonyScope: "CHURCH",
  description:
    "CO I PO CO\n" +
    "To ostatni moment na dopiecie formalnosci i przygotowanie przebiegu ceremonii.\n\n" +
    "JAK TO ZROBIC\n" +
    "- sprawdz czy wszystkie dokumenty sa podpisane\n" +
    "- ustal termin proby ceremonii\n" +
    "- zapytaj o spowiedz jesli jest praktykowana\n" +
    "- potwierdz godzine i miejsce slubu\n\n" +
    "KIEDY UZNAC ZA ZROBIONE\n" +
    "- podpisy sa zlozone\n" +
    "- znasz termin proby i wymagania parafii\n\n" +
    "WSKAZOWKI\n" +
    "- zapisz kto ma byc na probie\n" +
    "- sprawdz godziny otwarcia kancelarii",
},
{
  key: "formalities_church_ceremony_plan",
  title: "Formalności (kościelny): ustal przebieg ceremonii",
  module: "formalities",
  category: "FORMALNOSCI",
  offsetDays: -19,
  ceremonyScope: "CHURCH",
  description:
    "CO I PO CO\n" +
    "Ustalenie przebiegu ceremonii pozwala uniknac chaosu i niepewnosci w dniu slubu.\n\n" +
    "JAK TO ZROBIC\n" +
    "- wybierz czytania i osoby czytajace\n" +
    "- ustal muzyke i momenty wejsc\n" +
    "- zapisz kolejnosc ceremonii\n" +
    "- przekaz ustalenia osobom zaangazowanym\n\n" +
    "KIEDY UZNAC ZA ZROBIONE\n" +
    "- przebieg ceremonii jest ustalony\n" +
    "- osoby zaangazowane znaja swoje role\n\n" +
    "WSKAZOWKI\n" +
    "- prosty przebieg jest zawsze bezpieczniejszy\n" +
    "- nie zmieniaj planu na ostatnia chwile",
},
{
  key: "formalities_church_documents_to_take",
  title: "Formalności (kościelny): przygotuj dokumenty na dzien slubu",
  module: "formalities",
  category: "FORMALNOSCI",
  offsetDays: -4,
  ceremonyScope: "CHURCH",
  description:
    "CO I PO CO\n" +
    "Niektore parafie wymagaja dokumentow do okazania w dniu slubu.\n\n" +
    "JAK TO ZROBIC\n" +
    "- sprawdz liste dokumentow wymaganych na dzien slubu\n" +
    "- przygotuj teczke z dokumentami\n" +
    "- przekaz dokumenty osobie odpowiedzialnej\n\n" +
    "KIEDY UZNAC ZA ZROBIONE\n" +
    "- dokumenty sa przygotowane i spakowane\n\n" +
    "WSKAZOWKI\n" +
    "- nie trzymaj dokumentow luzno w torbie\n" +
    "- sprawdz dwa razy przed wyjazdem",
},
{
  key: "formalities_church_final_rehearsal",
  title: "Formalności (kościelny): finalna proba i potwierdzenia",
  module: "formalities",
  category: "FORMALNOSCI",
  offsetDays: -2,
  ceremonyScope: "CHURCH",
  description:
    "CO I PO CO\n" +
    "Finalna proba uspokaja przebieg ceremonii i daje pewnosc ze wszystko jest dopiete.\n\n" +
    "JAK TO ZROBIC\n" +
    "- pojdz na probe o ustalonej godzinie\n" +
    "- sprawdz wejscia i ustawienie osob\n" +
    "- potwierdz godzine rozpoczecia ceremonii\n\n" +
    "KIEDY UZNAC ZA ZROBIONE\n" +
    "- proba sie odbyla\n" +
    "- wszyscy wiedza co maja robic\n\n" +
    "WSKAZOWKI\n" +
    "- przyjdz kilka minut wczesniej\n" +
    "- nie zostawiaj pytan na dzien slubu",
},

{
  key: "reception_only_core_booking",
  title: "Przyjęcie: rezerwacja miejsca, muzyki i cateringu",
  module: "vendors",
  category: "ORGANIZACJA",
  offsetDays: -205,
  ceremonyScope: "RECEPTION_ONLY",
  description:
    "CO I PO CO\n" +
    "Miejsce, muzyka i jedzenie to fundament przyjecia. Bez tego nie da sie ruszyc dalej.\n\n" +
    "JAK TO ZROBIC\n" +
    "- wybierz miejsce przyjecia\n" +
    "- zarezerwuj muzyke\n" +
    "- ustal forme cateringu\n" +
    "- zapisz warunki i zaliczki\n\n" +
    "KIEDY UZNAC ZA ZROBIONE\n" +
    "- miejsce i muzyka sa zarezerwowane\n" +
    "- znasz koszt i warunki\n\n" +
    "WSKAZOWKI\n" +
    "- zapytaj co jest w cenie\n" +
    "- zapisz godziny trwania przyjecia",
},
{
  key: "reception_only_scenario",
  title: "Przyjęcie: ustal scenariusz wieczoru",
  module: "weddingDay",
  category: "DZIEN_SLUBU",
  offsetDays: -190,
  ceremonyScope: "RECEPTION_ONLY",
  description:
    "CO I PO CO\n" +
    "Scenariusz wieczoru pomaga utrzymac tempo i nie zapomniec o kluczowych momentach.\n\n" +
    "JAK TO ZROBIC\n" +
    "- zapisz godzine startu przyjecia\n" +
    "- ustal kolejnosc posilkow i atrakcji\n" +
    "- dodaj bufory czasowe\n\n" +
    "KIEDY UZNAC ZA ZROBIONE\n" +
    "- masz zapisany plan wieczoru\n\n" +
    "WSKAZOWKI\n" +
    "- zostaw przestrzen na spontanicznosc\n" +
    "- nie planuj wszystkiego co do minuty",
},
{
  key: "reception_only_decor_tort_attractions_photo",
  title: "Przyjęcie: dekoracje, tort, atrakcje i fotograf",
  module: "vendors",
  category: "ORGANIZACJA",
  offsetDays: -115,
  ceremonyScope: "RECEPTION_ONLY",
  description:
    "CO I PO CO\n" +
    "Elementy wizualne i atrakcje tworza klimat przyjecia i wspomnienia.\n\n" +
    "JAK TO ZROBIC\n" +
    "- wybierz dekoracje i styl\n" +
    "- zamow tort\n" +
    "- zdecyduj czy chcesz fotografa\n" +
    "- zapisz koszty i terminy\n\n" +
    "KIEDY UZNAC ZA ZROBIONE\n" +
    "- wiesz co zamawiasz i od kogo\n" +
    "- masz potwierdzone terminy\n\n" +
    "WSKAZOWKI\n" +
    "- mniej znaczy lepiej\n" +
    "- dekoracje dopasuj do miejsca",
},
{
  key: "reception_only_guests_rsvp",
  title: "Przyjęcie: zbieranie potwierdzeń od gości",
  module: "guests",
  category: "ORGANIZACJA",
  offsetDays: -100,
  ceremonyScope: "RECEPTION_ONLY",
  description:
    "CO I PO CO\n" +
    "Liczba gosci wplywa na jedzenie, miejsca i koszty.\n\n" +
    "JAK TO ZROBIC\n" +
    "- skontaktuj sie z goscmi\n" +
    "- zapisz potwierdzenia lub odmowy\n" +
    "- uaktualnij liste w systemie\n\n" +
    "KIEDY UZNAC ZA ZROBIONE\n" +
    "- wiekszosc gosci jest potwierdzona\n\n" +
    "WSKAZOWKI\n" +
    "- przypominaj spokojnie i z wyprzedzeniem\n" +
    "- nie czekaj do ostatniej chwili",
},
{
  key: "reception_only_final_count_menu_allergens",
  title: "Przyjęcie: finalna liczba osob i alergie",
  module: "guests",
  category: "ORGANIZACJA",
  offsetDays: -20,
  ceremonyScope: "RECEPTION_ONLY",
  description:
    "CO I PO CO\n" +
    "Finalna liczba osob jest potrzebna do zamowienia jedzenia i przygotowania sali.\n\n" +
    "JAK TO ZROBIC\n" +
    "- policz potwierdzonych gosci\n" +
    "- zbierz alergie i diety\n" +
    "- przekaz liste do cateringu\n\n" +
    "KIEDY UZNAC ZA ZROBIONE\n" +
    "- lista jest zamknieta\n" +
    "- catering ma wszystkie informacje\n\n" +
    "WSKAZOWKI\n" +
    "- zawsze dodaj 1 lub 2 porcje zapasu\n" +
    "- sprawdz liste dwa razy",
},
{
  key: "reception_only_evening_schedule_contacts",
  title: "Przyjęcie: harmonogram wieczoru i kontakty",
  module: "weddingDay",
  category: "DZIEN_SLUBU",
  offsetDays: -15,
  ceremonyScope: "RECEPTION_ONLY",
  description:
    "CO I PO CO\n" +
    "Harmonogram i kontakty zapobiegaja chaosowi w dniu przyjecia.\n\n" +
    "JAK TO ZROBIC\n" +
    "- spisz godziny kluczowych momentow\n" +
    "- przygotuj liste kontaktow do uslugodawcow\n" +
    "- przekaz ja osobie koordynujacej\n\n" +
    "KIEDY UZNAC ZA ZROBIONE\n" +
    "- harmonogram jest zapisany\n" +
    "- kontakty sa pod reka\n\n" +
    "WSKAZOWKI\n" +
    "- jedna osoba powinna odbierac telefony\n" +
    "- trzymaj wszystko w jednym miejscu",
},
{
  key: "reception_only_pickups_setup_confirm",
  title: "Przyjęcie: odbiory, ustawienia i potwierdzenia",
  module: "vendors",
  category: "ORGANIZACJA",
  offsetDays: -3,
  ceremonyScope: "RECEPTION_ONLY",
  description:
    "CO I PO CO\n" +
    "Ostatnie potwierdzenia zapewniaja spokojny start przyjecia.\n\n" +
    "JAK TO ZROBIC\n" +
    "- potwierdz godziny dostaw\n" +
    "- sprawdz ustawienie sali\n" +
    "- potwierdz obecnosci uslugodawcow\n\n" +
    "KIEDY UZNAC ZA ZROBIONE\n" +
    "- wszystko jest potwierdzone\n" +
    "- wiesz kto przyjezdza i kiedy\n\n" +
    "WSKAZOWKI\n" +
    "- zapisz numery telefonow na kartce\n" +
    "- zostaw zapas czasu na poprawki",
},


];