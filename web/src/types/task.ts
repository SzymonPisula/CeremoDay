export type TaskStatus = "pending" | "in_progress" | "done";

export type TaskCategory =
  | "FORMALNOSCI"
  | "ORGANIZACJA"
  | "USLUGI"
  | "DEKORACJE"
  | "LOGISTYKA"
  | "DZIEN_SLUBU";

export interface Task {
  id: string;
  event_id: string;

  title: string;
  description?: string | null;

  status: TaskStatus;

  category?: TaskCategory | null;

  // data wykonania / deadline
  due_date?: string | null;

  // ewentualne rozszerzenia
  auto_generated?: boolean;
  generated_from?: string | null;

  created_at?: string;
  updated_at?: string;
}

// Co wysyłamy do API przy tworzeniu/aktualizacji:
export type TaskPayload = Partial<
  Pick<Task, "title" | "description" | "status" | "category" | "due_date">
>;
