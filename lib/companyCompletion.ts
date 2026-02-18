import Company from "@/models/Company";

export interface CompanyCompletionStatus {
  isComplete: boolean;
  missingFields: string[];
}

export function evaluateCompanyCompletion(
  company: any
): CompanyCompletionStatus {
  const missingFields: string[] = [];

  if (!company.name) missingFields.push("name");

  if (!company.address?.country) missingFields.push("country");

  if (
    typeof company.coordinates?.latitude !== "number" ||
    typeof company.coordinates?.longitude !== "number"
  ) {
    missingFields.push("coordinates");
  }

  if (!company.offeredActivities || company.offeredActivities.length === 0) {
    missingFields.push("offeredActivities");
  }

  if (!company.description) missingFields.push("description");

  return {
    isComplete: missingFields.length === 0,
    missingFields,
  };
}
