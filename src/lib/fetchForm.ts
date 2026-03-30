export type InterviewSoon = 'yes' | 'no'
export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced'
export type QuestionType =
  | 'leetcode-easy'
  | 'leetcode-medium-standard'
  | 'leetcode-medium-hard'
  | 'leetcode-hard'
  | 'class-design-oop'

export type IntakeFormState = {
  email: string
  firstName: string
  lastName: string
  hasInterviewSoon: InterviewSoon
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
  hasInterviewSoon: 'no',
  company: '',
  experienceLevel: '',
  questionType: '',
  notes: '',
  referral: '',
}

export const INTERVIEW_SOON_OPTIONS: Array<{ value: InterviewSoon; label: string }> = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
]

export const EXPERIENCE_LEVEL_OPTIONS: Array<{
  value: ExperienceLevel
  label: string
}> = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
]

export const QUESTION_TYPE_OPTIONS: Array<{ value: QuestionType; label: string }> = [
  { value: 'leetcode-easy', label: 'Leetcode Easy' },
  { value: 'leetcode-medium-standard', label: 'Leetcode Medium (Standard)' },
  {
    value: 'leetcode-medium-hard',
    label: 'Leetcode Medium/Hard (More Difficult Medium)',
  },
  { value: 'leetcode-hard', label: 'Leetcode Hard' },
  { value: 'class-design-oop', label: 'Class Design / OOP Question' },
]
