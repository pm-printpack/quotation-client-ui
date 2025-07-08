import { CategoryAllMapping, CategoryMaterialItem, Material, CategoryOption, CategorySuboption, CategoryPrintingType, CategoryProductSubcategory } from "@/lib/features/categories.slice";

interface PrintingLengthCandidate {
  coordinate: [number, number];
  value: number;
  numOfMatchedModulus: number;
  matchedPerimeter: number;
}

const PERIMETER_AND_IMPOSITION_MATCHING_TABLE: number[][] = [
  [0,   507.500,  532.900,  558.300,  609.100,  634.500,  685.300],
  [15,  33.833,   35.527,   37.220,   40.607,   42.300,   45.687],
  [14,  36.250,   38.064,   39.879,   43.507,   45.321,   48.950],
  [13,  39.038,   40.992,   42.946,   46.854,   48.808,   52.715],
  [12,  42.292,   44.408,   46.525,   50.758,   52.875,   57.108],
  [11,  46.136,   48.445,   50.755,   55.373,   57.682,   62.300],
  [10,  50.750,   53.290,   55.830,   60.910,   63.450,   68.530],
  [9,   56.389,   59.211,   62.033,   67.678,   70.500,   76.144],
  [8,   63.438,   66.613,   69.788,   76.138,   79.313,   85.663],
  [7,   72.500,   76.129,   79.757,   87.014,   90.643,   97.900],
  [6,   84.583,   88.817,   93.050,   101.517,  105.750,  114.217],
  [5,   101.500,  106.580,  111.660,  121.820,  126.900,  137.060],
  [4,   126.875,  133.225,  139.575,  152.275,  158.625,  171.325],
  [3,   169.167,  177.633,  186.100,  203.033,  211.500,  228.433],
  [2,   253.750,  266.450,  279.150,  304.550,  317.250,  342.650]
];

export default {
  isCustomShaped: (options: CategoryOption[]): boolean => {
    const productionProcessOption: CategoryOption | undefined = options.filter((option: CategoryOption) => option.name.toLocaleLowerCase() === "production process")[0];
    if (productionProcessOption) {
      const suboptions: CategorySuboption[] = (productionProcessOption as CategoryOption<false>).suboptions;
      return suboptions.filter((suboption: CategorySuboption) => suboption.name.toLocaleLowerCase() === "special shape").length > 0;
    }
    return false;
  },

  getSelectedZipperSuboption: (options: CategoryOption[]): CategorySuboption | undefined => {
    const zipperTypeOption: CategoryOption | undefined = options.filter((option: CategoryOption) => option.name.toLocaleLowerCase() === "zipper type")[0];
    return (zipperTypeOption as CategoryOption<false>)?.suboptions[0];
  },

  /**
   * Under Offset Printing
   * 【袋子印刷长度范围】：异形：袋宽+10-20mm；非异形：袋宽+5-15mm
   * 【匹配模数】：按照最接近的尺寸在版辊表里匹配，从小增量优先
   */
  calculateNumOfMatchedModulus: (width: number, height: number, sku: number, options: CategoryOption<boolean>[]): {numOfMatchedModulus: number, matchedPerimeter: number} => {
    let printingLengthRange: [number, number] = [width, width];
    let customShaped: boolean = false;
    const productionProcessOption: CategoryOption | undefined = options.filter((option: CategoryOption) => option.name.toLocaleLowerCase() === "production process")[0];
    if (productionProcessOption) {
      const suboptions: CategorySuboption[] = (productionProcessOption as CategoryOption<false>).suboptions;
      customShaped = suboptions.filter((suboption: CategorySuboption) => suboption.name.toLocaleLowerCase() === "special shape").length > 0;
    }
    if (customShaped) {
      printingLengthRange = [width + 10, width + 20];
    } else {
      printingLengthRange = [width + 5, width + 15];
    }
    const printingLengthCandidates: PrintingLengthCandidate[] = [];
    for (let i: number = 1; i < PERIMETER_AND_IMPOSITION_MATCHING_TABLE.length; ++i) {
      for (let j: number = 1; j < PERIMETER_AND_IMPOSITION_MATCHING_TABLE[i].length; ++j) {
        const elementOfTable: number = PERIMETER_AND_IMPOSITION_MATCHING_TABLE[i][j];
        if (elementOfTable >= printingLengthRange[0] && elementOfTable <= printingLengthRange[1]) {
          const coordinate: [number, number] = [i, j];
          printingLengthCandidates.push({
            coordinate: coordinate,
            value: elementOfTable,
            numOfMatchedModulus: PERIMETER_AND_IMPOSITION_MATCHING_TABLE[coordinate[0]][0],
            matchedPerimeter: PERIMETER_AND_IMPOSITION_MATCHING_TABLE[0][coordinate[1]]
          });
        }
      }
    }
    console.log("printingLengthCandidates: ", printingLengthCandidates);
    if (printingLengthCandidates.filter(({numOfMatchedModulus}) => numOfMatchedModulus > sku).length === printingLengthCandidates.length) {
      const a1: PrintingLengthCandidate[] = printingLengthCandidates.filter(({numOfMatchedModulus}) => numOfMatchedModulus % sku === 0);
      if (a1.length > 0) {
        const {numOfMatchedModulus, matchedPerimeter} = a1.sort((a: {value: number}, b: {value: number}) => a.value - b.value)[0];
        return {
          numOfMatchedModulus: numOfMatchedModulus,
          matchedPerimeter: matchedPerimeter
        };
      }
    }
    const b1: PrintingLengthCandidate[] = printingLengthCandidates.filter(({numOfMatchedModulus}) => numOfMatchedModulus === sku);
    if (b1.length > 0) {
      const {numOfMatchedModulus, matchedPerimeter} = b1[0];
      return {
        numOfMatchedModulus: numOfMatchedModulus,
        matchedPerimeter: matchedPerimeter
      };
    }
    if (printingLengthCandidates.filter(({numOfMatchedModulus}) => sku > numOfMatchedModulus).length === printingLengthCandidates.length) {
      const c1: PrintingLengthCandidate[] = printingLengthCandidates.filter(({numOfMatchedModulus}) => sku % numOfMatchedModulus === 0);
      if (c1.length === 1) {
        const {numOfMatchedModulus, matchedPerimeter} = c1[0];
        return {
          numOfMatchedModulus: numOfMatchedModulus,
          matchedPerimeter: matchedPerimeter
        };
      } else if (c1.length > 1) {
        const {numOfMatchedModulus, matchedPerimeter} = c1.sort((a: {numOfMatchedModulus: number}, b: {numOfMatchedModulus: number}) => sku / a.numOfMatchedModulus - sku / b.numOfMatchedModulus)[0];
        return {
          numOfMatchedModulus: numOfMatchedModulus,
          matchedPerimeter: matchedPerimeter
        };
      } else {
        const d1: (PrintingLengthCandidate & {integer: number})[] = printingLengthCandidates
          .map((candidate) => ({...candidate, integer: Math.floor(sku / candidate.numOfMatchedModulus)}))
          .sort((a: {integer: number}, b: {integer: number}) => a.integer - b.integer);
        if (d1[0].integer !== d1[1].integer) {
          const {numOfMatchedModulus, matchedPerimeter} = d1[0];
          return {
            numOfMatchedModulus: numOfMatchedModulus,
            matchedPerimeter: matchedPerimeter
          };
        } else {
          let integer: number = d1[0].integer;
          let i : number = 1;
          for (; i < d1.length; ++i) {
            if (d1[i].integer !== integer) {
              break;
            }
          }
          const {numOfMatchedModulus, matchedPerimeter} = d1.slice(0, i).sort((a: PrintingLengthCandidate, b: PrintingLengthCandidate) => a.value - b.value)[0];
          return {
            numOfMatchedModulus: numOfMatchedModulus,
            matchedPerimeter: matchedPerimeter
          };
        }
      }
    }
    if (printingLengthCandidates.length > 0) {
      const {numOfMatchedModulus, matchedPerimeter} = printingLengthCandidates.sort((a: PrintingLengthCandidate, b: PrintingLengthCandidate) => a.value - b.value)[0];
      return {
        numOfMatchedModulus: numOfMatchedModulus,
        matchedPerimeter: matchedPerimeter
      };
    }
    return {
      numOfMatchedModulus: 1,
      matchedPerimeter: 0
    };
  },

  formatQuotationText: (input?: string): string => {
    if (!input) {
      return "";
    }
    const lines: string[] = input.split("\n").map(line => line.trim()).filter(Boolean);
    const result: string[] = [];

    let currentSection: string[] = [];

    function processSection(sectionLines: string[]): string {
      const sectionResult: string[] = [];

      for (let i: number = 0; i < sectionLines.length; i += 2) {
        const key: string = sectionLines[i];
        const value: string = sectionLines[i + 1];

        if (key === "Estimated Delivery Time") {
          const air: string = sectionLines[i + 1];
          const sea: string = sectionLines[i + 2];
          const airMatch: RegExpMatchArray = air.match(/Air Freight:\s*(.+)/) || ["", ""];
          const seaMatch: RegExpMatchArray = sea.match(/Sea Freight:\s*(.+)/) || ["", ""];

          sectionResult.push(
            `Estimated Delivery Time: ${airMatch[1]}(Air Freight), ${seaMatch[1]}(Sea Freight)`
          );
          i += 2; // Skip extra line
        } else {
          sectionResult.push(`${key}: ${value}`);
        }
      }

      return sectionResult.join("\n");
    }

    for (let i: number = 0; i < lines.length; i++) {
      const line: string = lines[i];

      if (/^Quantity \(Option \d+\)$/.test(line)) {
        // 遇到新的 Option，处理旧的
        if (currentSection.length) {
          result.push(processSection(currentSection));
          result.push(""); // 空行分隔段落
          currentSection = [];
        }
        // 把 Option 行本身当作 key，空值
        currentSection.push(`- ${ line }`);
        currentSection.push(""); // 占位符
      } else {
        currentSection.push(line);
      }
    }

    if (currentSection.length) {
      result.push(processSection(currentSection));
    }

    return result.join("\n");
  },

  splitCatgeoryOptions: (categoryProductSubcategory: CategoryProductSubcategory, categoryPrintingType: CategoryPrintingType, options: CategoryOption[]): {categoryAllMappings: CategoryAllMapping[], categorySuboptions: CategorySuboption[]; materials: Material[];} => {
    const categoryAllMappings: CategoryAllMapping[] = [];
    const categorySuboptions: CategorySuboption[] = [];
    const materials: Material[] = [];
    for (const option of options) {
      if (option.isMaterial) {
        const materialItems: (CategoryMaterialItem | undefined)[] = (option as CategoryOption<true>).suboptions;
        for (const materialItem of materialItems) {
          if (materialItem) {
            const suboptions: Material[] = materialItem.suboptions;
            for (const suboption of suboptions) {
              if (suboption) {
                materials.push(suboption);
              }
            }
          }
        }
      } else {
        const suboptions: CategorySuboption[] = (option as CategoryOption<false>).suboptions;
        for (const suboption of suboptions) {
          if (suboption) {
            categorySuboptions.push(suboption);
            categoryAllMappings.push({
              categoryProductSubcategoryId: categoryProductSubcategory.id,
              categoryProductSubcategory: categoryProductSubcategory,
              categoryPrintingTypeId: categoryPrintingType.id,
              categoryPrintingType: categoryPrintingType,
              categoryOptionId: option.id,
              categoryOption: option,
              categorySuboptionId: suboption.id,
              categorySuboption: suboption,
              isVisible: true
            });
          }
        }
      }
    }
    return {categoryAllMappings, categorySuboptions, materials};
  },

  getProductionProcessSuboptionByName: (suboptionNameInProductProcess: string, options: CategoryOption[]): CategorySuboption | undefined => {
    const productionProcessOption: CategoryOption<false> | undefined = options.find(({name, isMaterial}) => !isMaterial && name.toLowerCase() === "production process") as (CategoryOption<false> | undefined);
    return productionProcessOption?.suboptions.find(({name}) => name.toLowerCase() === suboptionNameInProductProcess.toLowerCase());
  }
};