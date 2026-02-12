export const JOB_CATEGORIES = [
  { value: "instructor", label: "Instructor" },
  { value: "customer_support", label: "Customer Support" },
  { value: "hospitality", label: "Hospitality" },
  { value: "sales", label: "Sales" },
  { value: "management", label: "Management" },
  { value: "marketing", label: "Marketing" },
  { value: "other", label: "Other" }
] as const;

export type JobCategory = typeof JOB_CATEGORIES[number]["value"];

/** Values array for Mongoose enum and validation */
export const JOB_CATEGORY_VALUES = JOB_CATEGORIES.map((c) => c.value);
