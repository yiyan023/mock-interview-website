export type InterviewSoon = 'Yes' | 'No'
export type ExperienceLevel = 'Beginner' | 'Intermediate' | 'Advanced'
export type QuestionType =
  | 'Leetcode Easy'
  | 'Leetcode Medium (Standard)'
  | 'Leetcode Medium/Hard (More Difficult Medium)'
  | 'Leetcode Hard'
  | 'Class Design / OOP Question'

export type IntakeFormState = {
  email: string
  firstName: string
  lastName: string
  hasInterviewSoon: InterviewSoon | ''
  company: string
  experienceLevel: ExperienceLevel | ''
  questionType: QuestionType | ''
  notes: string
  referral: string
}

export const INITIAL_INTAKE_FORM: IntakeFormState = {
  email: '',
  firstName: '',
  lastName: '',
  hasInterviewSoon: '',
  company: '',
  experienceLevel: '',
  questionType: '',
  notes: '',
  referral: '',
}

export const INTERVIEW_SOON_OPTIONS: Array<{ value: InterviewSoon; label: string }> = [
  { value: 'Yes', label: 'Yes' },
  { value: 'No', label: 'No' },
]

export const EXPERIENCE_LEVEL_OPTIONS: Array<{
  value: ExperienceLevel
  label: string
}> = [
  { value: 'Beginner', label: 'Beginner' },
  { value: 'Intermediate', label: 'Intermediate' },
  { value: 'Advanced', label: 'Advanced' },
]

export const QUESTION_TYPE_OPTIONS: Array<{ value: QuestionType; label: string }> = [
  { value: 'Leetcode Easy', label: 'Leetcode Easy' },
  { value: 'Leetcode Medium (Standard)', label: 'Leetcode Medium (Standard)' },
  { value: 'Leetcode Medium/Hard (More Difficult Medium)', label: 'Leetcode Medium/Hard (More Difficult Medium)' },
  { value: 'Leetcode Hard', label: 'Leetcode Hard' },
  { value: 'Class Design / OOP Question', label: 'Class Design / OOP Question' },
]
