// src/lib/vin.ts

export type VinDecodeResult = {
  ok: boolean;
  normalizedVin: string;
  brandName?: string;
  modelName?: string;
  year?: number;
  bodyType?: string;
  message: string;
};

type DemoVinRule = {
  prefix: string;
  brandName: string;
  modelName: string;
  year: number;
  bodyType: string;
};

const DEMO_VIN_RULES: DemoVinRule[] = [
  {
    prefix: "WBA",
    brandName: "BMW",
    modelName: "3 серия",
    year: 2020,
    bodyType: "Sedan",
  },
  {
    prefix: "WBX",
    brandName: "BMW",
    modelName: "X5",
    year: 2021,
    bodyType: "SUV",
  },
  {
    prefix: "WAU",
    brandName: "Audi",
    modelName: "A4",
    year: 2021,
    bodyType: "Sedan",
  },
  {
    prefix: "WDD",
    brandName: "Mercedes-Benz",
    modelName: "C-Class",
    year: 2022,
    bodyType: "Sedan",
  },
  {
    prefix: "JTN",
    brandName: "Toyota",
    modelName: "Camry",
    year: 2021,
    bodyType: "Sedan",
  },
];

function normalizeVin(input: string): string {
  return input.toUpperCase().replace(/\s+/g, "").trim();
}

export function decodeVinDemo(input: string): VinDecodeResult {
  const normalizedVin = normalizeVin(input);

  if (!normalizedVin) {
    return {
      ok: false,
      normalizedVin,
      message: "Введи VIN-код для подбора автомобиля.",
    };
  }

  if (normalizedVin.length < 11) {
    return {
      ok: false,
      normalizedVin,
      message: "VIN слишком короткий. Для демо-подбора используй VIN длиной не менее 11 символов.",
    };
  }

  const matchedRule = DEMO_VIN_RULES.find((rule) =>
    normalizedVin.startsWith(rule.prefix)
  );

  if (!matchedRule) {
    return {
      ok: false,
      normalizedVin,
      message:
        "Этот VIN не распознан демо-декодером. Для проверки можно использовать VIN, начинающийся с WBA, WBX, WAU, WDD или JTN.",
    };
  }

  return {
    ok: true,
    normalizedVin,
    brandName: matchedRule.brandName,
    modelName: matchedRule.modelName,
    year: matchedRule.year,
    bodyType: matchedRule.bodyType,
    message: `VIN распознан: ${matchedRule.brandName} ${matchedRule.modelName}, ${matchedRule.year}, ${matchedRule.bodyType}.`,
  };
}