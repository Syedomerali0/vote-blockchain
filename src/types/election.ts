export interface Election {
  id: string;
  title: string;
  department: string;
  description: string;
  start_time: string | number;  // Can be either string (ISO format) or number (timestamp)
  end_time: string | number;    // Can be either string (ISO format) or number (timestamp)
  is_active: boolean;
  isActive?: boolean;           // Alias for is_active for backward compatibility
  candidates_count: number;
  candidates?: any[];           // Optional candidates array
  sort_end_time?: number;       // Optional field for sorting
}

export interface Candidate {
  id: number;
  name: string;
  voteCount: number;
}

export interface VoteHistory {
  electionId: number;
  candidateId: number;
  timestamp: number;
}
