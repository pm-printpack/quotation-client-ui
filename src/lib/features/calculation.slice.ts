import { ActionReducerMapBuilder, createAsyncThunk, createSlice, PayloadAction, SerializedError } from "@reduxjs/toolkit";
import { CategoryMaterialItem, CategoryMaterialSuboption, CategoryOption, CategorySuboption, PrintingType, ProductSubcategory } from "./categories.slice";
import CalculationUtil from "@/app/utils/CalculationUtil";
import { RootState } from "../store";
import { Customer, CustomerTier } from "./customers.slice";
import { useRequest } from "@/hooks/useRequest";
import { ExhangeRate } from "./environment.slice";

const {post} = useRequest();

interface DigitalPrintingQuotationHistory {
  /**
   * 印刷宽度（mm）
   */
  printingWidth: number;

  /**
   * 横向印刷数
   */
  horizontalLayoutCount: number;

  /**
   * 每印袋数
   */
  numOfBagsPerImpression: number;

  /**
   * 印刷长度（m）
   */
  printingLength: number;

  /**
   * 印数
   */
  printingQuantity: number;
}

interface OffsetPrintingQuotationHistory {
  /**
   * 匹配模数
   */
  numOfMatchedModulus: number;

  /**
   * 匹配周长
   */
  matchedPerimeter: number;

  /**
   * 倍数
   */
  multiple: number;

  /**
   * 印刷用SKU数
   */
  numOfSKUs4Printing: number;

  /**
   * 材料宽度（mm）
   */
  materialWidth: number;

  /**
   * 印刷宽度（mm）
   */
  printingWidth: number;

  /**
   * 印刷长度（m）
   */
  printingLength: number;
}

interface GravurePrintingQuotationHistory {
  /**
   * 材料宽度（mm）
   */
  materialWidth: number;

  /**
   * 版长（mm）
   */
  plateLength: number;

  /**
   * 单袋印刷长/mm
   */
  printingLengthPerPackage: number;

  /**
   * 版周/mm
   */
  platePerimeter: number;

  /**
   * 版费（元）
   */
  plateFee: number;
}

interface NewQuotationHistory {
  customerId: number;
  categoryProductSubcategoryId: number;
  categoryPrintingTypeId: number;

  width: number;
  height: number;
  gusset?: number;

  /**
   * number of SKU
   */
  numOfStyles: number;

  /**
   * quantity of per SKU
   */
  quantityPerStyle: number;

  /**
   * total quantity of SKU
   */
  totalQuantity: number;

  categorySuboptions: CategorySuboption[];
  
  materials: CategoryMaterialSuboption[];

  /**
   * 成本总价（元）
   */
  totalCostInCNY: number;

  /**
   * 总价（元）
   */
  totalPriceInCNY: number;

  /**
   * 总价（美元）
   */
  totalPriceInUSD: number;

  /**
   * 记录时的汇率，1美元兑多少RMB
   */
  exchangeRateUSDToCNY: number;

  /**
   * 材料面积（㎡）
   */
  materialArea: number;

  /**
   * 印刷费（元）
   */
  printingCost: number;

  /**
   * 材料费（元）
   */
  materialCost: number;

  /**
   * 复合费（元）
   */
  laminationCost: number;

  /**
   * 制袋费（元）
   */
  bagMakingCost: number;

  /**
   * 刀模费（元）
   */
  dieCuttingCost: number;

  /**
   * 包装费（元）
   */
  packagingCost: number;

  /**
   * 人工费（元）
   */
  laborCost: number;

  /**
   * 文件处理费（元）
   */
  fileProcessingFee: number;

  digitalPrinting?: DigitalPrintingQuotationHistory;

  offsetPrinting?: OffsetPrintingQuotationHistory;

  gravurePrinting?: GravurePrintingQuotationHistory;
}

interface CalculationState {
  loading: boolean;
  totalPrices: number[];
  totalWeights: number[];
}

const initialState: CalculationState = {
  loading: false,
  totalPrices: [0],
  totalWeights: [0]
};

export type BaseCaseValue = {
  numOfStyles: number;
  quantityPerStyle: number;
  totalQuantity: number;
} & Record<string, number>;

export type Size = {
  width?: number;
  height?: number;
  gusset?: number;
};

type TotalPriceCalculationParams = Size & {
  categoryProductSubcategoryId: number;
  categoryPrintingTypeId: number;
  cases: BaseCaseValue[];
  options: CategoryOption<boolean>[];
};
type TotalWeightCalculationParams = TotalPriceCalculationParams;

function getPrintingTypeProfitMargin(printingTypeName: string, customerTier: CustomerTier): number {
  switch (printingTypeName.toLowerCase()) {
    case "digital printing":
      return customerTier.digitalPrintingProfitMargin;
    case "offset printing":
      return customerTier.offsetPrintingProfitMargin;
    case "gravure printing":
      return customerTier.gravurePrintingProfitMargin;
    default:
      return 0;
  }
}

function calculateProfitMargin(originalPrice: number, printingTypeName: string, customerTier?: CustomerTier): number {
  if (!customerTier) {
    return originalPrice;
  }
  const printingTypeProfitMargin: number = getPrintingTypeProfitMargin(printingTypeName, customerTier);
  if (originalPrice <= customerTier.minimumDiscountAmount1) {
    return originalPrice * (1 + printingTypeProfitMargin / 100);
  } else if (originalPrice > customerTier.minimumDiscountAmount1 && originalPrice <= customerTier.minimumDiscountAmount2) {
    return originalPrice * (1 + printingTypeProfitMargin / 100 - customerTier.preferentialProfitMargin1 / 100);
  } else {
    return originalPrice * (1 + printingTypeProfitMargin / 100 - customerTier.preferentialProfitMargin2 / 100);
  }
}

export const calculateTotalPriceByDigitalPrinting = createAsyncThunk<number[], TotalPriceCalculationParams>(
  "calculation/calculateTotalPriceByDigitalPrinting",
  async (params: TotalPriceCalculationParams, {getState}): Promise<number[]> => {
    const { categoryProductSubcategoryId, categoryPrintingTypeId, width, height, gusset, cases, options } = params;
      if (!width || !height) {
        return [];
      }
      const user: Customer | undefined = (getState() as RootState).customers.user;
      if (!user) {
        return [];
      }
      const exchangeRateValue: number = (getState() as RootState).env.exchangeRate?.rate || 1;
      const newQuotationHistories: NewQuotationHistory[] = [];
      for (const baseCase of cases) {
        // Printing Cost
        const printingWidth: number = (height + 10) * 2 + (gusset || 0);
        const horizontalLayoutCount: number = Math.floor(740 / printingWidth);
        const numOfBagsPerImpression: number = Math.floor(1120 / (width + 5));
        const printingQuantity: number = baseCase.totalQuantity / horizontalLayoutCount / numOfBagsPerImpression;
        const printingCost: number = printingQuantity * 3.8;
        console.log("printingWidth: ", printingWidth);
        console.log("horizontalLayoutCount: ", horizontalLayoutCount);
        console.log("numOfBagsPerImpression: ", numOfBagsPerImpression);
        console.log("printingQuantity: ", printingQuantity);
        console.log("printingCost: ", printingCost);

        // Material Cost
        const printingLength: number = baseCase.totalQuantity / horizontalLayoutCount * (width + 5) / 1000 * (1.1 + (baseCase.numOfStyles - 1) * 0.5) + 50;
        const materialArea: number = printingLength * 760 / 1000;
        let totalUnitPricePerSquareMeter: number = 0;
        for (let i: number = 0; i < options.length; ++i) {
          const option: CategoryOption = options[i];
          if (option.isMaterial) {
            const materialItems: (CategoryMaterialItem | undefined)[] = (option as CategoryOption<true>).suboptions;
            for (let j: number = 0; j < materialItems.length; ++j) {
              const materialItem: CategoryMaterialItem | undefined = materialItems[j];
              if (materialItem) {
                const suboptions: CategorySuboption[] = materialItem.suboptions;
                for (let n: number = 0; n < suboptions.length; ++n) {
                  totalUnitPricePerSquareMeter += suboptions[n].unitPricePerSquareMeter || 0;
                }
              }
            }
          } else {
            const suboptions: CategorySuboption[] = (option as CategoryOption<false>).suboptions;
            for (let n: number = 0; n < suboptions.length; ++n) {
              totalUnitPricePerSquareMeter += suboptions[n].unitPricePerSquareMeter || 0;
            }
          }
        }
        const materialCost: number = materialArea * totalUnitPricePerSquareMeter;
        console.log("printingLength: ", printingLength);
        console.log("materialArea: ", materialArea);
        console.log("materialCost: ", materialCost);

        // Composite Processing Fee
        let numOfLaminationLayers: number = 0;
        const laminationLayerOption: CategoryOption | undefined = options.filter((option: CategoryOption) => option.name.toLocaleLowerCase() === "layer material")[0];
        if (laminationLayerOption) {
          numOfLaminationLayers = (laminationLayerOption as CategoryOption<true>).suboptions.filter((materialItem: CategoryMaterialItem | undefined) => !!materialItem).length;
        }
        const laminationCost: number = (0.25 + 0.15 * numOfLaminationLayers) * materialArea;
        console.log("laminationCost: ", laminationCost);

        // Bag Making Cost
        let bagMakingCost: number = 0;
        const customShaped: boolean = CalculationUtil.isCustomShaped(options);
        const zipperTypeOption: CategoryOption | undefined = options.filter((option: CategoryOption) => option.name.toLocaleLowerCase() === "zipper type")[0];
        const zipperTypeName: string = ((zipperTypeOption as CategoryOption<false>)?.suboptions.map((suboption: CategorySuboption) => suboption.name)[0] || "No Zipper").toLocaleLowerCase();
        if (customShaped) {
          if (["no zipper", "normal zipper"].includes(zipperTypeName)) {
            bagMakingCost = printingLength > 1000 ? 0.45 * printingLength : 450;
          } else if (["cr zipper", "easy-tear zipper", "degradable zipper", "bone zipper", "powder zipper", "slider zipper", "velcro zipper"].includes(zipperTypeName)) {
            bagMakingCost = printingLength > 1000 ? 0.55 * printingLength : 550;
          }
        } else {
          if (["no zipper", "normal zipper"].includes(zipperTypeName)) {
            bagMakingCost = printingLength > 1000 ? 0.3 * printingLength : 300;
          } else if (["cr zipper", "easy-tear zipper", "degradable zipper", "bone zipper", "powder zipper", "slider zipper", "velcro zipper"].includes(zipperTypeName)) {
            bagMakingCost = printingLength > 1000 ? 0.45 * printingLength : 450;
          }
        }
        console.log("bagMakingCost: ", bagMakingCost);

        // Die-Cutting Cost
        const dieCuttingCost: number = customShaped ? 600 : 0;
        console.log("dieCuttingCost: ", dieCuttingCost);

        // Packaging Cost
        const packagingCost: number = Math.ceil(baseCase.totalQuantity / 2000) * 10;
        console.log("packagingCost: ", packagingCost);

        const totalCostInCNY: number = (printingCost + materialCost + laminationCost + bagMakingCost + dieCuttingCost + packagingCost) * 1.08;
        const totalPriceInCNY: number = calculateProfitMargin(totalCostInCNY, "Digital printing", user.tier);

        newQuotationHistories.push({
          customerId: user.id,
          categoryProductSubcategoryId: categoryProductSubcategoryId,
          categoryPrintingTypeId: categoryPrintingTypeId,
          width: width,
          height: width,
          gusset: gusset,
          numOfStyles: baseCase.numOfStyles,
          quantityPerStyle: baseCase.quantityPerStyle,
          totalQuantity: baseCase.totalQuantity,
          categorySuboptions: [],
          materials: [],
          totalCostInCNY: totalCostInCNY,
          totalPriceInCNY: totalPriceInCNY,
          totalPriceInUSD: totalPriceInCNY / exchangeRateValue,
          exchangeRateUSDToCNY: exchangeRateValue,
          materialArea: materialArea,
          printingCost: printingCost,
          materialCost: materialCost,
          laminationCost: laminationCost,
          bagMakingCost: bagMakingCost,
          dieCuttingCost: dieCuttingCost,
          packagingCost: packagingCost,
          laborCost: 0,
          fileProcessingFee: 0,
          digitalPrinting: {
            printingWidth: printingWidth,
            horizontalLayoutCount: horizontalLayoutCount,
            numOfBagsPerImpression: numOfBagsPerImpression,
            printingLength: printingLength,
            printingQuantity: printingQuantity
          }
        });
      }

      // if (user) {
      //   await Promise.all(newQuotationHistories.map((newQuotationHistory) => post("/quotation-histories", newQuotationHistory)))
      // }
      return newQuotationHistories.map(({totalPriceInCNY}) => totalPriceInCNY);
  }
);

export const calculateTotalPriceByOffsetPrinting = createAsyncThunk<number[], TotalPriceCalculationParams & {numOfMatchedModulus: number; matchedPerimeter:number;}>(
  "calculation/calculateTotalPriceByOffsetPrinting",
  async (params: TotalPriceCalculationParams & {numOfMatchedModulus: number; matchedPerimeter: number;}, {getState}): Promise<number[]> => {
    const { categoryProductSubcategoryId, categoryPrintingTypeId, width, height, gusset, cases, numOfMatchedModulus, matchedPerimeter, options } = params;
    if (!width || !height) {
      return [];
    }
    const user: Customer | undefined = (getState() as RootState).customers.user;
    if (!user) {
      return [];
    }
    const exchangeRateValue: number = (getState() as RootState).env.exchangeRate?.rate || 1;
    const newQuotationHistories: NewQuotationHistory[] = [];
    for (const baseCase of cases) {
      // Printing Cost
      const numOfSKUs4Printing: number = Math.ceil(baseCase.numOfStyles / numOfMatchedModulus) * numOfMatchedModulus;
      const printingLength: number = (width + 10) * baseCase.totalQuantity / baseCase.numOfStyles * numOfSKUs4Printing / 1000 + 250;
      let printingCost: number = 0;
      if (printingLength <= 1000) {
        printingCost = 1300;
      } else {
        printingCost = 1300 + (printingLength - 1000) * 0.2;
      }
      console.log("printingLength: ", printingLength);
      console.log("printingCost: ", printingCost);
      
      // Material Cost
      const customShaped: boolean = CalculationUtil.isCustomShaped(options);
      console.log("customShaped: ", customShaped);
      let printingWidth: number = 0;
      if (customShaped) {
        printingWidth = (height + 10) * 2 + (gusset || 0) + 10 + 14;
      } else {
        printingWidth = (height + 6) * 2 + (gusset || 0) + 6 + 14;
      }
      let materialWidth: number = 0;
      const printingWidthCeil: number = Math.ceil(printingWidth);
      if (printingWidthCeil <= 310) {
        materialWidth = 310;
      } else if (printingWidthCeil <= 360) {
        materialWidth = 360;
      } else if (printingWidthCeil <= 400) {
        materialWidth = 400;
      } else if (printingWidthCeil <= 460) {
        materialWidth = 460;
      } else if (printingWidthCeil <= 520) {
        materialWidth = 520;
      } else {
        throw new Error("For unconventional widths, please ask the salesperson to confirm the quotation.");
      }
      const materialArea: number = materialWidth * printingLength / 1000;
      let materialCost: number = 0;
      const materialChineseNames: string[] = [];
      for (let i: number = 0; i < options.length; ++i) {
        const option: CategoryOption = options[i];
        if (option.isMaterial) {
          const materialItems: (CategoryMaterialItem | undefined)[] = (option as CategoryOption<true>).suboptions;
          for (let j: number = 0; j < materialItems.length; ++j) {
            const materialItem: CategoryMaterialItem | undefined = materialItems[j];
            if (materialItem) {
              const suboptions: CategorySuboption[] = materialItem.suboptions;
              for (let n: number = 0; n < suboptions.length; ++n) {
                materialChineseNames.push(suboptions[n].chineseName);
              }
            }
          }
        }
      }
      if (materialChineseNames.find((name: string) => ["触感膜", "拉丝膜"].includes(name))) {
        materialCost = 3.5 * materialArea;
      } else {
        materialCost = 3 * materialArea;
      }
      console.log("printingWidth: ", printingWidth);
      console.log("materialWidth: ", materialWidth);
      console.log("materialArea: ", materialArea);
      console.log("materialCost: ", materialCost);

      // Bag Making Cost
      let bagMakingCost: number = 0;
      const zipperTypeOption: CategoryOption | undefined = options.filter((option: CategoryOption) => option.name.toLocaleLowerCase() === "zipper type")[0];
      const zipperTypeName: string = ((zipperTypeOption as CategoryOption<false>)?.suboptions.map((suboption: CategorySuboption) => suboption.name)[0] || "No Zipper").toLocaleLowerCase();
      if (customShaped) {
        if (["no zipper", "normal zipper"].includes(zipperTypeName)) {
          bagMakingCost = printingLength > 1000 ? 0.45 * printingLength : 450;
        } else if (["cr zipper", "easy-tear zipper", "degradable zipper", "bone zipper", "powder zipper", "slider zipper", "velcro zipper"].includes(zipperTypeName)) {
          bagMakingCost = printingLength > 1000 ? 0.55 * printingLength : 550;
        }
      } else {
        if (["no zipper", "normal zipper"].includes(zipperTypeName)) {
          bagMakingCost = printingLength > 1000 ? 0.3 * printingLength : 300;
        } else if (["cr zipper", "easy-tear zipper", "degradable zipper", "bone zipper", "powder zipper", "slider zipper", "velcro zipper"].includes(zipperTypeName)) {
          bagMakingCost = printingLength > 1000 ? 0.45 * printingLength : 450;
        }
      }
      console.log("bagMakingCost: ", bagMakingCost);

      // Die-Cutting Cost
      const dieCuttingCost: number = customShaped ? 600 : 0;
      console.log("dieCuttingCost: ", dieCuttingCost);

      // Labor Cost
      const laborCost: number = baseCase.totalQuantity * 0.02;
      console.log("laborCost: ", laborCost);
      
      // Packaging Cost
      const packagingCost: number = Math.ceil(baseCase.totalQuantity / 2000) * 10;
      console.log("packagingCost: ", packagingCost);

      // File processing Fee
      const fileProcessingFee: number = baseCase.numOfStyles * 50;
      console.log("fileProcessingFee: ", fileProcessingFee);

      const totalCostInCNY: number = (printingCost + materialCost + bagMakingCost + dieCuttingCost + laborCost + packagingCost + fileProcessingFee) * 1.08;
      const totalPriceInCNY: number = calculateProfitMargin(totalCostInCNY, "Offset printing", user.tier);

      newQuotationHistories.push({
        customerId: user.id,
        categoryProductSubcategoryId: categoryProductSubcategoryId,
        categoryPrintingTypeId: categoryPrintingTypeId,
        width: width,
        height: width,
        gusset: gusset,
        numOfStyles: baseCase.numOfStyles,
        quantityPerStyle: baseCase.quantityPerStyle,
        totalQuantity: baseCase.totalQuantity,
        categorySuboptions: [],
        materials: [],
        totalCostInCNY: totalCostInCNY,
        totalPriceInCNY: totalPriceInCNY,
        totalPriceInUSD: totalPriceInCNY / exchangeRateValue,
        exchangeRateUSDToCNY: exchangeRateValue,
        materialArea: materialArea,
        printingCost: printingCost,
        materialCost: materialCost,
        laminationCost: 0,
        bagMakingCost: bagMakingCost,
        dieCuttingCost: dieCuttingCost,
        packagingCost: packagingCost,
        laborCost: laborCost,
        fileProcessingFee: fileProcessingFee,
        offsetPrinting: {
          numOfMatchedModulus: numOfMatchedModulus,
          matchedPerimeter: matchedPerimeter,
          multiple: Math.floor(baseCase.numOfStyles / numOfMatchedModulus),
          numOfSKUs4Printing: numOfSKUs4Printing,
          printingWidth: printingWidth,
          materialWidth: materialWidth,
          printingLength: printingLength
        }
      });
    }
    // if (user) {
    //   await Promise.all(newQuotationHistories.map((newQuotationHistory) => post("/quotation-histories", newQuotationHistory)))
    // }
    return newQuotationHistories.map(({totalPriceInCNY}) => totalPriceInCNY);
  }
);

export const calculateTotalPriceByGravurePrinting = createAsyncThunk<number[], TotalPriceCalculationParams>(
  "calculation/calculateTotalPriceByGravurePrinting",
  async (params: TotalPriceCalculationParams, {getState}): Promise<number[]> => {
    const { categoryProductSubcategoryId, categoryPrintingTypeId, width, height, gusset, cases, options } = params;
    if (!width || !height) {
      return [];
    }
    const user: Customer | undefined = (getState() as RootState).customers.user;
    if (!user) {
      return [];
    }
    const exchangeRateValue: number = (getState() as RootState).env.exchangeRate?.rate || 1;
    const newQuotationHistories: NewQuotationHistory[] = [];
    for (const baseCase of cases) {
      // Material Cost
      const printingLengthPerPackage: number = (width + 2.5) * 2;
      const customShaped: boolean = CalculationUtil.isCustomShaped(options);
      const materialWidth: number = customShaped ? (height + 20) * 2 + (gusset || 0) : (height + 10) * 2 + (gusset || 0);
      let materialArea: number = (printingLengthPerPackage * materialWidth * baseCase.totalQuantity) / 1000000;
      let totalMaterialUnitPricePerSquareMeter: number = 0;
      for (let i: number = 0; i < options.length; ++i) {
        const option: CategoryOption = options[i];
        if (option.isMaterial) {
          const materialItems: (CategoryMaterialItem | undefined)[] = (option as CategoryOption<true>).suboptions;
          for (let j: number = 0; j < materialItems.length; ++j) {
            const materialItem: CategoryMaterialItem | undefined = materialItems[j];
            if (materialItem) {
              const suboptions: CategorySuboption[] = materialItem.suboptions;
              for (let n: number = 0; n < suboptions.length; ++n) {
                totalMaterialUnitPricePerSquareMeter += suboptions[n].unitPricePerSquareMeter;
              }
            }
          }
        }
      }
      const materialCost: number = materialArea * totalMaterialUnitPricePerSquareMeter;
      console.log("printingLengthPerPackage: ", printingLengthPerPackage);
      console.log("materialWidth: ", materialWidth);
      console.log("totalMaterialUnitPricePerSquareMeter: ", totalMaterialUnitPricePerSquareMeter);
      console.log("materialArea: ", materialArea);
      console.log("materialCost: ", materialCost);

      // Printing Cost
      let totalUnitPricePerSquareMeter: number = 0;
      for (let i: number = 0; i < options.length; ++i) {
        const option: CategoryOption = options[i];
        if (!option.isMaterial && ["color", "production process"].includes(option.name.toLocaleLowerCase())) {
          const suboptions: CategorySuboption[] = (option as CategoryOption<false>).suboptions;
          for (let j: number = 0; j < suboptions.length; ++j) {
            totalUnitPricePerSquareMeter += suboptions[j].unitPricePerSquareMeter;
          }
        }
      }
      const printingCost: number = materialArea * totalUnitPricePerSquareMeter;
      console.log("printingCost: ", printingCost);

      // Composite Processing Fee
      let numOfLaminationLayers: number = 0;
      const laminationLayerOption: CategoryOption | undefined = options.filter((option: CategoryOption) => option.name.toLocaleLowerCase() === "layer material")[0];
      if (laminationLayerOption) {
        numOfLaminationLayers = (laminationLayerOption as CategoryOption<true>).suboptions.filter((materialItem: CategoryMaterialItem | undefined) => !!materialItem).length;
      }
      const laminationCost: number = (0.25 + 0.15 * numOfLaminationLayers) * materialArea;
      console.log("laminationCost: ", laminationCost);

      // Bag Making Cost
      const productSubcategories: ProductSubcategory[] = (getState() as RootState).categories.productSubcategories;
      const selectedProductSubcategory: ProductSubcategory | undefined = productSubcategories.filter((productSubcategory: ProductSubcategory) => productSubcategory.id === categoryProductSubcategoryId)[0];
      let totalProductionProcessUnitPricePerSquareMeter: number = 0;
      for (let i: number = 0; i < options.length; ++i) {
        const option: CategoryOption = options[i];
        if (!option.isMaterial && option.name.toLocaleLowerCase() === "production process") {
          for (let j: number = 0; j < option.suboptions.length; ++j) {
            const suboption: CategorySuboption = (option as CategoryOption<false>).suboptions[j];
            if (["spout", "valve"].includes(suboption.name.toLocaleLowerCase())) {
              totalProductionProcessUnitPricePerSquareMeter += suboption.unitPricePerSquareMeter;
            }
          }
        }
      }
      let bagMakingCost: number = 0;
      const selectedZipperSuboption: CategorySuboption | undefined = CalculationUtil.getSelectedZipperSuboption(options);
      const isSelectedsquareBottomBag: boolean = selectedProductSubcategory && selectedProductSubcategory.name.toLocaleLowerCase() === "square bottom bag";
      if (isSelectedsquareBottomBag) {
        if (!selectedZipperSuboption || selectedZipperSuboption.name.toLocaleLowerCase() === "no zipper") {
          bagMakingCost = 0.5 * printingLengthPerPackage * baseCase.totalQuantity / 1000 + baseCase.totalQuantity * totalProductionProcessUnitPricePerSquareMeter;
        } else {
          bagMakingCost = 0.6 * printingLengthPerPackage * baseCase.totalQuantity / 1000 + baseCase.totalQuantity * totalProductionProcessUnitPricePerSquareMeter;
        }
      } else {
        bagMakingCost = 0.2 * materialArea + (selectedZipperSuboption?.unitPricePerSquareMeter || 0) * printingLengthPerPackage * baseCase.totalQuantity / 1000 + baseCase.totalQuantity * totalProductionProcessUnitPricePerSquareMeter;
      }
      console.log("bagMakingCost: ", bagMakingCost);

      // Plate Fee
      let numOfPlate: number = 0;
      for (let i: number = 0; i < options.length; ++i) {
        const option: CategoryOption = options[i];
        if (!option.isMaterial && option.name.toLocaleLowerCase() === "color") {
          numOfPlate = Number(((option as CategoryOption<false>).suboptions[0].name.match(/(\d+)\s*colors?/) || [])[1] || 0);
        }
      }
      const plateFee: number = numOfPlate * 450;
      console.log("plateFee: ", plateFee);

      // Packaging Cost
      const packagingCost: number = Math.ceil(baseCase.totalQuantity / 2000) * 10;
      console.log("packagingCost: ", packagingCost);

      // Plate Length
      let plateLength: number = 0;
      if (materialWidth <= 600) {
        plateLength = 650;
      } else if (materialWidth <= 700) {
        plateLength = 750;
      } else if (materialWidth <= 800) {
        plateLength = 850;
      } else if (materialWidth <= 900) {
        plateLength = 950;
      } else if (materialWidth <= 1050) {
        plateLength = 1100;
      } else {
        throw new Error("The plate length met an error.");
      }

      console.log("isSelectedsquareBottomBag: ", isSelectedsquareBottomBag);
      const totalCostInCNY: number = (isSelectedsquareBottomBag ? 1.55 : 1.35) * materialCost + printingCost + laminationCost + bagMakingCost + plateFee + packagingCost;
      const totalPriceInCNY: number = calculateProfitMargin(totalCostInCNY, "Gravure printing", user?.tier);
      newQuotationHistories.push({
        customerId: user.id,
        categoryProductSubcategoryId: categoryProductSubcategoryId,
        categoryPrintingTypeId: categoryPrintingTypeId,
        width: width,
        height: width,
        gusset: gusset,
        numOfStyles: baseCase.numOfStyles,
        quantityPerStyle: baseCase.quantityPerStyle,
        totalQuantity: baseCase.totalQuantity,
        categorySuboptions: [],
        materials: [],
        totalCostInCNY: totalCostInCNY,
        totalPriceInCNY: totalPriceInCNY,
        totalPriceInUSD: totalPriceInCNY / exchangeRateValue,
        exchangeRateUSDToCNY: exchangeRateValue,
        materialArea: materialArea,
        printingCost: printingCost,
        materialCost: materialCost,
        laminationCost: laminationCost,
        bagMakingCost: bagMakingCost,
        dieCuttingCost: 0,
        packagingCost: packagingCost,
        laborCost: 0,
        fileProcessingFee: 0,
        gravurePrinting: {
          materialWidth: materialWidth,
          plateLength: plateLength,
          printingLengthPerPackage: printingLengthPerPackage,
          platePerimeter: Math.min(Math.ceil(400 / printingLengthPerPackage) * printingLengthPerPackage, 800),
          plateFee: plateFee
        }
      });
    }
    // if (user) {
    //   await Promise.all(newQuotationHistories.map((newQuotationHistory) => post("/quotation-histories", newQuotationHistory)))
    // }
    return newQuotationHistories.map(({totalPriceInCNY}) => totalPriceInCNY);
  }
);

export const calculateTotalWeight = createAsyncThunk<number[], TotalWeightCalculationParams>(
  "calculation/calculateTotalWeight",
  async (params: TotalPriceCalculationParams, {getState}): Promise<number[]> => {
    const { categoryProductSubcategoryId, width, height, cases, options } = params;
    if (!width || !height) {
      return cases.map(() => 0);
    }
    const productSubcategories: ProductSubcategory[] = (getState() as RootState).categories.productSubcategories;
    const selectedProductSubcategory: ProductSubcategory | undefined = productSubcategories.filter((productSubcategory: ProductSubcategory) => productSubcategory.id === categoryProductSubcategoryId)[0];
    if (selectedProductSubcategory) {
      let surfaceDensity: number = 0;
      for (const option of options) {
        if (option.isMaterial) {
          for (const materialItem of (option as CategoryOption<true>).suboptions) {
            if (materialItem) {
              for (const suboption of materialItem.suboptions) {
                surfaceDensity += suboption.density * suboption.thickness;
              }
            }
          }
        }
      }
      const totalWeights: number[] = [];
      for (const baseCase of cases) {
        switch(selectedProductSubcategory.name.toLowerCase()) {
          case "3 side seal bag":
            totalWeights.push(
              surfaceDensity / 10000 * baseCase.totalQuantity * (width * height * 2) / 100 / 1000 + baseCase.totalQuantity * 0.003 + Math.ceil(baseCase.totalQuantity / 2000)
            );
            break;
          case "stand-up bag":
          case "fin seal bag":
          case "fin seal gusset bag":
          case "4 side seal bag":
          case "square bottom bag":
          case "bag in box":
          case "film":
            totalWeights.push(
              surfaceDensity / 10000 * baseCase.totalQuantity * (width * height * 2) / 100 / 1000 * 1.212 + baseCase.totalQuantity * 0.003 + Math.ceil(baseCase.totalQuantity / 2000)
            );
            break;
          case "spout bag":
            totalWeights.push(
              surfaceDensity / 10000 * baseCase.totalQuantity * (width * height * 2) / 100 / 1000 * 1.212 + baseCase.totalQuantity * 0.0036 + Math.ceil(baseCase.totalQuantity / 500)
            );
            break;
        }
      }
      return totalWeights;
    }
    return cases.map(() => 0);
  }
);

export const calculationSlice = createSlice({
  name: "calculation",
  initialState: initialState,
  reducers: {
  },
  extraReducers: (builder: ActionReducerMapBuilder<CalculationState>) => {
    [calculateTotalPriceByDigitalPrinting, calculateTotalPriceByGravurePrinting].forEach((asyncThunk) => {
      builder.addCase(asyncThunk.fulfilled, (state: CalculationState, action: PayloadAction<number[]>) => {
        state.totalPrices = action.payload;
      });
      builder.addCase(asyncThunk.rejected, (state: CalculationState, action: PayloadAction<unknown, string, unknown, SerializedError>) => {
        console.error("calculation slice error: ", action.error);
      });
    });
    builder.addCase(calculateTotalWeight.fulfilled, (state: CalculationState, action: PayloadAction<number[]>) => {
      state.totalWeights = action.payload;
    });
  }
});

export const {} = calculationSlice.actions;

export default calculationSlice.reducer;