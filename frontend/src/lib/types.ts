export interface Company {
  id: string;
  name: string;
  slug: string;
}

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  title: string | null;
  isHR: boolean;
  isManager: boolean;
  managerId?: string | null;
  manager?: { id: string; name: string } | null;
  company: Company;
}

export interface Parameter {
  id: string;
  key: string;
  label: string;
  order: number;
}

export interface ScoreEntry {
  id: string;
  score: number;
  comment: string;
  parameter: Parameter;
}

export interface FeedbackEntry {
  id: string;
  period: string;
  submittedAt: string;
  manager: { id: string; name: string };
  scores: ScoreEntry[];
}

export interface ReportSummary {
  id: string;
  name: string;
  title: string | null;
  email: string;
}

export interface TrackerRow {
  employeeId: string;
  employeeName: string;
  employeeTitle: string | null;
  managerId: string;
  managerName: string;
  submitted: boolean;
  submittedAt: string | null;
}

export interface TrackerResponse {
  period: string;
  total: number;
  missingCount: number;
  rows: TrackerRow[];
}
