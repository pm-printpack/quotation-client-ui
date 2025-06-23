import { CategoryMaterialItem, CategoryOption, CategorySuboption, PrintingType, ProductSubcategory } from "@/lib/features/categories.slice";

const PERIMETER_AND_IMPOSITION_MATCHING_TABLE: number[][] = [
  [0,   20,       21,       22,       24,       25,       27],
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
   * 【袋子印刷长度范围】：异形：袋宽+10-20mm；非异形：袋宽+5-15mm
   * 【匹配模数】：按照最接近的尺寸在版辊表里匹配，从小增量优先
   */
  calculateNumOfMatchedModulus: (width: number, height: number, options: CategoryOption<boolean>[]): {numOfMatchedModulus: number, perimeter: number} => {
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
    const printingLengthCandidates: {coordinate: [number, number], value: number}[] = [];
    for (let i: number = 1; i < PERIMETER_AND_IMPOSITION_MATCHING_TABLE.length; ++i) {
      for (let j: number = 1; j < PERIMETER_AND_IMPOSITION_MATCHING_TABLE[i].length; ++j) {
        const elementOfTable: number = PERIMETER_AND_IMPOSITION_MATCHING_TABLE[i][j];
        if (elementOfTable >= printingLengthRange[0] && elementOfTable <= printingLengthRange[1]) {
          printingLengthCandidates.push({
            coordinate: [i, j],
            value: elementOfTable
          });
        }
      }
    }
    if (printingLengthCandidates.length > 0) {
      const {coordinate} = printingLengthCandidates.sort((a: {coordinate: [number, number], value: number}, b: {coordinate: [number, number], value: number}) => a.value - b.value)[0];
      return {
        numOfMatchedModulus: PERIMETER_AND_IMPOSITION_MATCHING_TABLE[coordinate[0]][0],
        perimeter: PERIMETER_AND_IMPOSITION_MATCHING_TABLE[0][coordinate[1]]
      };
    }
    return {
      numOfMatchedModulus: 1,
      perimeter: 0
    };
  },

  formatQuotationText: (input?: string): string => {
    if (!input) {
      return "";
    }
    console.log("input: ", input);
    const lines = input.split("\n").map(line => line.trim()).filter(Boolean);

    const [title, subtitle, ...rest] = lines;
    const result = [`${title}\n${subtitle}\n`];

    let currentSection = [];

    function processSection(sectionLines: string[]) {
      const sectionResult: string[] = [];

      for (let i: number = 0; i < sectionLines.length; i += 2) {
        const key = sectionLines[i];
        const value = sectionLines[i + 1];

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

    for (let i: number = 0; i < rest.length; i++) {
      const line: string = rest[i];

      if (/^Quantity \(Option \d+\)$/.test(line)) {
        // 遇到新的 Option，处理旧的
        if (currentSection.length) {
          result.push(processSection(currentSection));
          result.push(""); // 空行分隔段落
          currentSection = [];
        }
        // 把 Option 行本身当作 key，空值
        currentSection.push(line);
        currentSection.push(""); // 占位符
      } else {
        currentSection.push(line);
      }
    }

    if (currentSection.length) {
      result.push(processSection(currentSection));
    }

    return result.join("\n");
  }

  // getTextQuotationDetail: (
  //   printingTypes: PrintingType[],
  //   selectedPrintingTypeId: number,
  //   productSubcategories: ProductSubcategory[],
  //   selectedProductSubcategoryId: number,
  //   formValues: {width?: number, height?: number, gusset?: number},
  //   hasGusset: boolean,
  //   selectedOptions: CategoryOption<boolean>[]
  // ): string => {
  //   const productName: string = productSubcategories.find(({ id }) => id === selectedProductSubcategoryId)?.name || "";
  //   const printingType: string = printingTypes.find(({ id }) => id === selectedPrintingTypeId)?.name || "";
  //   const result: string[] = [
  //     "Quotation Details for",
  //     `${printingType} of ${productName}s`,
  //     "",
  //     `Product Name: ${productName}`,
  //     `Printing Type: ${printingType}`,
  //     `Size: ${formValues?.width || 0}mm x ${formValues?.height || 0}mm${hasGusset ? ` x ${formValues?.gusset || 0}mm` : ""}`
  //   ];
  //   selectedOptions.forEach((option: CategoryOption) => {
  //     if (option.isMaterial) {
  //       (option as CategoryOption<true>).suboptions.forEach((materialItem: CategoryMaterialItem | undefined, index: number) => {
  //         if (materialItem) {
  //           materialItem.suboptions.forEach((suboption: CategorySuboption) => {
  //             const key: string = `${option.name}${option.suboptions.length > 1 ? ` ${index + 1}` : ""}`
  //             result.push(`${key}: ${suboption.name}`);
  //           })
  //         }
  //       });
  //     } else {
  //       result.push(`${option.name}: ${(option as CategoryOption<false>).suboptions[0].name}`);
  //     }
  //   })
  //   return result.join("\n");
  // }
};