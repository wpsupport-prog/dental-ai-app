export interface DemographicMatrix {
  preg10to14: number; preg15to19: number; preg20to49: number;
  infantMale: number; infantFemale: number;
  age1Male: number; age1Female: number;
  age2Male: number; age2Female: number;
  age3Male: number; age3Female: number;
  age4Male: number; age4Female: number;
  school1to4Male: number; school1to4Female: number;
  age5Male: number; age5Female: number;
  age6Male: number; age6Female: number;
  school5to6Male: number; school5to6Female: number;
  age7Male: number; age7Female: number;
  age8Male: number; age8Female: number;
  age9Male: number; age9Female: number;
  school5to9Male: number; school5to9Female: number;
  adolescentExcept12Male: number; adolescentExcept12Female: number;
  adolescent12Male: number; adolescent12Female: number;
  adolescent15to19Male: number; adolescent15to19Female: number;
  adult20to59Male: number; adult20to59Female: number;
  older60PlusMale: number; older60PlusFemale: number;
  totalAllAgesMale: number; totalAllAgesFemale: number;
  grandTotal: number;
}

export const createEmptyMatrix = (): DemographicMatrix => ({
  preg10to14: 0, preg15to19: 0, preg20to49: 0,
  infantMale: 0, infantFemale: 0,
  age1Male: 0, age1Female: 0, age2Male: 0, age2Female: 0,
  age3Male: 0, age3Female: 0, age4Male: 0, age4Female: 0,
  school1to4Male: 0, school1to4Female: 0,
  age5Male: 0, age5Female: 0, age6Male: 0, age6Female: 0,
  school5to6Male: 0, school5to6Female: 0,
  age7Male: 0, age7Female: 0, age8Male: 0, age8Female: 0,
  age9Male: 0, age9Female: 0,
  school5to9Male: 0, school5to9Female: 0,
  adolescentExcept12Male: 0, adolescentExcept12Female: 0,
  adolescent12Male: 0, adolescent12Female: 0,
  adolescent15to19Male: 0, adolescent15to19Female: 0,
  adult20to59Male: 0, adult20to59Female: 0,
  older60PlusMale: 0, older60PlusFemale: 0,
  totalAllAgesMale: 0, totalAllAgesFemale: 0,
  grandTotal: 0,
});