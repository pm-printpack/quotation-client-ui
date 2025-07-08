import { ActionReducerMapBuilder, createAsyncThunk, createSlice, PayloadAction, SerializedError } from "@reduxjs/toolkit";
import { CategoryAllMapping, CategoryMaterialItem, CategoryOption, CategorySuboption, CategoryPrintingType, CategoryProductSubcategory, MaterialDisplay } from "./categories.slice";
import CalculationUtil from "@/app/utils/CalculationUtil";
import { RootState } from "../store";
import { Customer, CustomerTier } from "./customers.slice";
import { useRequest } from "@/hooks/useRequest";

const {post} = useRequest();

interface DigitalPrintingQuotationHistory {
  /**
   * 印刷宽度（mm）
   */
  printingWidth: string;

  /**
   * 横向印刷数
   */
  horizontalLayoutCount: string;

  /**
   * 每印袋数
   */
  numOfBagsPerPrinting: string;

  /**
   * 印刷长度（m）
   */
  printingLength: string;

  /**
   * 印数
   */
  printingQuantity: string;
}

interface OffsetPrintingQuotationHistory {
  /**
   * 匹配模数
   */
  numOfMatchedModulus: string;

  /**
   * 匹配周长
   */
  matchedPerimeter: string;

  /**
   * 倍数
   */
  multiple: string;

  /**
   * 印刷用SKU数
   */
  numOfSKUs4Printing: string;

  /**
   * 材料宽度（mm）
   */
  materialWidth: string;

  /**
   * 印刷宽度（mm）
   */
  printingWidth: string;

  /**
   * 印刷长度（m）
   */
  printingLength: string;
}

interface GravurePrintingQuotationHistory {
  /**
   * 材料宽度（mm）
   */
  materialWidth: string;

  /**
   * 版长（mm）
   */
  plateLength: string;

  /**
   * 单袋印刷长/mm
   */
  printingLengthPerPackage: string;

  /**
   * 版周/mm
   */
  platePerimeter: string;

  /**
   * 版费（元）
   */
  plateFee: string;
}

interface NewQuotationHistory {
  customerId: number;
  categoryProductSubcategoryId: number;
  categoryPrintingTypeId: number;

  width: string;
  height: string;
  gusset?: string;

  /**
   * number of SKU
   */
  numOfStyles: string;

  /**
   * quantity of per SKU
   */
  quantityPerStyle: string;

  /**
   * total quantity of SKU
   */
  totalQuantity: string;

  // categorySuboptions: CategorySuboption[];
  categoryAllMappings: CategoryAllMapping[];
  
  materialDisplays: MaterialDisplay[];

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
  materialArea: string;

  /**
   * 印刷费（元）
   */
  printingCost: string;

  /**
   * 材料费（元）
   */
  materialCost: string;

  /**
   * 复合费（元）
   */
  laminationCost: string;

  /**
   * 制袋费（元）
   */
  bagMakingCost: string;

  /**
   * 刀模费（元）
   */
  dieCuttingCost: string;

  /**
   * 包装费（元）
   */
  packagingCost: string;

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
  numOfMatchedModulus?: number;
  matchedPerimeter?: number;
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
      const categoryProductSubcategory: CategoryProductSubcategory | undefined = (getState() as RootState).categories.productSubcategories.find(({id}) => id === categoryProductSubcategoryId);
      if (!categoryProductSubcategory) {
        return [];
      }
      const categoryPrintingType: CategoryPrintingType | undefined = (getState() as RootState).categories.printingTypes.find(({id}) => id === categoryPrintingTypeId);
      if (!categoryPrintingType) {
        return [];
      }
      const isSelectedFlatBottomBag: boolean = categoryProductSubcategory.name.toLowerCase() === "flat bottoom bag";
      const exchangeRateValue: number = (getState() as RootState).env.exchangeRate?.rate || 1;
      const newQuotationHistories: NewQuotationHistory[] = [];
      for (const baseCase of cases) {
        // Printing Cost
        let printingWidth: number = 0;
        let printingWidthSide: number = 0;
        if (isSelectedFlatBottomBag) {
          printingWidth = (height + 20) * 2 + (gusset || 0);
          printingWidthSide = ((gusset || 0) + 10) * 2;
        } else if (["3 side seal bag", "stand-up bag"].includes(categoryProductSubcategory.name.toLowerCase())) {
          printingWidth = (height + 10) * 2 + (gusset || 0) + 6 + 24;
        } else if (categoryProductSubcategory.name.toLowerCase() === "4 side seal bag") {
          printingWidth = (width + (gusset || 0) + 20) * 2;
        } else {
          printingWidth = (height + 10) * 2 + (gusset || 0);
        }
        const horizontalLayoutCount: number = Math.floor(740 / printingWidth);
        let horizontalLayoutCountSide: number = 0;
        if (isSelectedFlatBottomBag) {
          horizontalLayoutCountSide = Math.floor(740 / printingWidthSide);
        }
        const numOfBagsPerPrinting: number = Math.floor(1120 / (width + 5));
        let numOfBagsPerPrintingSide: number = 0;
        if (isSelectedFlatBottomBag) {
          numOfBagsPerPrintingSide = Math.floor(1120 / (height + 5));
        }
        let printingQuantity: number = 0;
        let printingQuantitySide: number = 0;
        if (["3 side seal bag", "stand-up bag", "4 side seal bag"].includes(categoryProductSubcategory.name.toLowerCase())) {
          printingQuantity = Math.ceil(baseCase.totalQuantity / horizontalLayoutCount / numOfBagsPerPrinting);
        } else {
          printingQuantity = baseCase.totalQuantity / horizontalLayoutCount / numOfBagsPerPrinting;
        }
        if (isSelectedFlatBottomBag) {
          printingQuantity = Math.ceil(printingQuantity);
          printingQuantitySide = Math.ceil(baseCase.totalQuantity / horizontalLayoutCountSide / numOfBagsPerPrintingSide);
        } 
        let printingCost: number = 0;
        let printingCostSide: number = 0;
        if (isSelectedFlatBottomBag || ["3 side seal bag", "stand-up bag"].includes(categoryProductSubcategory.name.toLowerCase())) {
          for (let i: number = 0; i < options.length; ++i) {
            const option: CategoryOption = options[i];
            if (!option.isMaterial) {
              const suboptions: CategorySuboption[] = (option as CategoryOption<false>).suboptions;
              for (let j: number = 0; j < suboptions.length; ++j) {
                const suboption: CategorySuboption = suboptions[j];
                if (suboption.name.toLowerCase() === "uv") {
                  printingCost = printingQuantity * 5 + 210;
                  if (isSelectedFlatBottomBag) {
                    printingCostSide = printingQuantitySide * 5 + 210;
                  }
                } else if (suboption.name.toLowerCase() === "gold stamping") {
                  printingCost = printingQuantity * 5.8 + 230;
                  if (isSelectedFlatBottomBag) {
                    printingCostSide = printingQuantitySide * 5.8 + 230;
                  }
                }
              }
            }
          }
          if (printingCost === 0) {
            printingCost = printingQuantity * 4.8;
          }
          if (isSelectedFlatBottomBag && printingCostSide === 0) {
            printingCostSide = printingQuantitySide * 4.8;
          }
        } else {
          printingCost = printingQuantity * 3.8;
        }
        if (
          ["3 side seal bag", "stand-up bag", "4 side seal bag", "flat bottoom bag"].includes(categoryProductSubcategory.name.toLowerCase())
          && CalculationUtil.getProductionProcessSuboptionByName("Inner printing", options)
        ) {
          printingCost *= 2;
        }
        console.log("printingWidth: ", printingWidth);
        console.log("horizontalLayoutCount: ", horizontalLayoutCount);
        console.log("numOfBagsPerPrinting: ", numOfBagsPerPrinting);
        console.log("printingQuantity: ", printingQuantity);
        console.log("printingCost: ", printingCost);

        // Material Cost
        let printingLength: number = 0;
        let printingLengthSide: number = 0;
        if (isSelectedFlatBottomBag || ["3 side seal bag", "stand-up bag"].includes(categoryProductSubcategory.name.toLowerCase())) {
          printingLength = (baseCase.totalQuantity + 100 * baseCase.numOfStyles) / horizontalLayoutCount * (width + 5) / 1000 * (1.1 + (baseCase.numOfStyles - 1) * 0.05) + 300;
        } else {
          printingLength = baseCase.totalQuantity / horizontalLayoutCount * (width + 5) / 1000 * (1.1 + (baseCase.numOfStyles - 1) * 0.5) + 50;
        }
        if (isSelectedFlatBottomBag) {
          printingLengthSide = (baseCase.totalQuantity + 100 * baseCase.numOfStyles) / horizontalLayoutCount * (height + 5) / 1000 * (1.1 + (baseCase.numOfStyles - 1) * 0.05) + 300;
        }
        
        const materialArea: number = printingLength * 760 / 1000;
        let materialAreaSide: number = 0;
        if (isSelectedFlatBottomBag) {
          materialAreaSide = printingLengthSide * 760 / 1000;
        }
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
          }
        }
        const materialCost: number = materialArea * totalUnitPricePerSquareMeter;
        let materialCostSide: number = 0;
        if (isSelectedFlatBottomBag) {
          materialCostSide = materialAreaSide * totalUnitPricePerSquareMeter;
        }
        console.log("printingLength: ", printingLength);
        console.log("printingLengthSide: ", printingLengthSide);
        console.log("materialArea: ", materialArea);
        console.log("materialAreaSide: ", materialAreaSide);
        console.log("materialCost: ", materialCost);
        console.log("materialCostSide: ", materialCostSide);

        // Composite Processing Fee
        let numOfLaminationLayers: number = 0;
        const laminationLayerOption: CategoryOption | undefined = options.filter((option: CategoryOption) => option.name.toLowerCase() === "layer material")[0];
        if (laminationLayerOption) {
          numOfLaminationLayers = (laminationLayerOption as CategoryOption<true>).suboptions.filter((materialItem: CategoryMaterialItem | undefined) => !!materialItem).length;
        }
        const laminationCost: number = (0.25 + 0.15 * numOfLaminationLayers) * materialArea;
        let laminationCostSide: number = 0;
        if (isSelectedFlatBottomBag) {
          laminationCostSide = (0.25 + 0.15 * numOfLaminationLayers) * materialAreaSide;
        }
        console.log("laminationCost: ", laminationCost);
        console.log("laminationCostSide: ", laminationCostSide);

        // Bag Making Cost
        let bagMakingCost: number = 0;
        const customShaped: boolean = CalculationUtil.isCustomShaped(options);
        const zipperTypeOption: CategoryOption | undefined = options.filter((option: CategoryOption) => option.name.toLowerCase() === "zipper type")[0];
        const zipperTypeName: string = ((zipperTypeOption as CategoryOption<false>)?.suboptions.map((suboption: CategorySuboption) => suboption.name)[0] || "No Zipper").toLowerCase();
        const productionProcessTypeOption: CategoryOption | undefined = options.filter((option: CategoryOption) => option.name.toLowerCase() === "production process")[0];
        const accessoryUnitPrice: number = (productionProcessTypeOption as CategoryOption<false>)?.suboptions.find(({name}) => name.toLowerCase() === "valve")?.unitPricePerSquareMeter || 0;
        if (["3 side seal bag", "stand-up bag"].includes(categoryProductSubcategory.name.toLowerCase())) {
          if (["no zipper", "normal zipper"].includes(zipperTypeName)) {
            if (customShaped) {
              bagMakingCost = printingLength > 1000 ? 0.4 * printingLength + 0.113 * baseCase.totalQuantity : 400;
            } else {
              bagMakingCost = printingLength > 1000 ? 0.3 * printingLength : 300;
            }
          } else if (["cr zipper", "easy-tear zipper", "degradable zipper", "bone zipper", "powder zipper", "slider zipper", "velcro zipper"].includes(zipperTypeName)) {
            if (customShaped) {
              bagMakingCost = printingLength > 1000 ? 0.55 * printingLength + 0.113 * baseCase.totalQuantity : 550;
            } else {
              bagMakingCost = printingLength > 1000 ? 0.45 * printingLength : 450;
            }
          }
          if (width < 100) {
            bagMakingCost = Math.max(bagMakingCost, 0.02 * baseCase.totalQuantity) + accessoryUnitPrice * baseCase.totalQuantity;
          }
        } else if (["4 side seal bag", "flat bottoom bag"].includes(categoryProductSubcategory.name.toLowerCase())) {
          if (["no zipper", "normal zipper"].includes(zipperTypeName)) {
            bagMakingCost = Math.max(0.8 * printingLength, 1200) + accessoryUnitPrice * baseCase.totalQuantity;
          } else if (["cr zipper", "easy-tear zipper", "degradable zipper", "bone zipper", "powder zipper", "slider zipper", "velcro zipper"].includes(zipperTypeName)) {
            bagMakingCost = Math.max(1 * printingLength, 1200) + accessoryUnitPrice * baseCase.totalQuantity;
          }
        } else {
          if (["no zipper", "normal zipper"].includes(zipperTypeName)) {
            if (customShaped) {
              bagMakingCost = printingLength > 1000 ? 0.45 * printingLength : 450;
            } else {
              bagMakingCost = printingLength > 1000 ? 0.3 * printingLength : 300;
            }
          } else if (["cr zipper", "easy-tear zipper", "degradable zipper", "bone zipper", "powder zipper", "slider zipper", "velcro zipper"].includes(zipperTypeName)) {
            if (customShaped) {
              bagMakingCost = printingLength > 1000 ? 0.55 * printingLength : 550;
            } else {
              bagMakingCost = printingLength > 1000 ? 0.45 * printingLength : 450;
            }
          }
        }
        if (["3 side seal bag", "stand-up bag", "4 side seal bag", "flat bottoom bag"].includes(categoryProductSubcategory.name.toLowerCase())) {
          const tinTieSuboption: CategorySuboption | undefined = CalculationUtil.getProductionProcessSuboptionByName("Tin Tie", options);
          if (tinTieSuboption) {
            bagMakingCost += tinTieSuboption.unitPricePerSquareMeter * baseCase.totalQuantity;
          }
        }
        console.log("bagMakingCost: ", bagMakingCost);

        // Die-Cutting Cost
        const dieCuttingCost: number = customShaped ? 600 : 0;
        console.log("dieCuttingCost: ", dieCuttingCost);

        // Packaging Cost
        const packagingCost: number = Math.ceil(baseCase.totalQuantity / 2000) * 10;
        console.log("packagingCost: ", packagingCost);

        const totalCostInCNY: number = (printingCost + printingCostSide + materialCost + materialCostSide + laminationCost + laminationCostSide + bagMakingCost + dieCuttingCost + packagingCost) * 1.08;
        const totalPriceInCNY: number = calculateProfitMargin(totalCostInCNY, "Digital printing", user.tier);

        const {categoryAllMappings, materials} = CalculationUtil.splitCatgeoryOptions(categoryProductSubcategory, categoryPrintingType, options);

        newQuotationHistories.push({
          customerId: user.id,
          categoryProductSubcategoryId: categoryProductSubcategoryId,
          categoryPrintingTypeId: categoryPrintingTypeId,
          width: `${ width }`,
          height: `${ height }`,
          gusset: `${ gusset || "" }`,
          numOfStyles: `${ baseCase.numOfStyles }`,
          quantityPerStyle: `${ baseCase.quantityPerStyle }`,
          totalQuantity: `${ baseCase.totalQuantity }`,
          categoryAllMappings: categoryAllMappings,
          materialDisplays: materials.map(({displays}) => displays[0]),
          totalCostInCNY: totalCostInCNY,
          totalPriceInCNY: totalPriceInCNY,
          totalPriceInUSD: totalPriceInCNY / exchangeRateValue,
          exchangeRateUSDToCNY: exchangeRateValue,
          materialArea: isSelectedFlatBottomBag ? `${ materialArea }/${ materialAreaSide }` : `${ materialArea }`,
          printingCost: isSelectedFlatBottomBag ? `${ printingCost }/${ printingCostSide }` : `${ printingCost }`,
          materialCost: isSelectedFlatBottomBag ? `${ materialCost }/${ materialCostSide }` : `${ materialCost }`,
          laminationCost: isSelectedFlatBottomBag ? `${ laminationCost }/${ laminationCostSide }` : `${ laminationCost }`,
          bagMakingCost: `${ bagMakingCost }`,
          dieCuttingCost: `${ dieCuttingCost }`,
          packagingCost: `${ packagingCost }`,
          laborCost: 0,
          fileProcessingFee: 0,
          digitalPrinting: {
            printingWidth: isSelectedFlatBottomBag ? `${ printingWidth }/${printingWidthSide}` : `${ printingWidth }`,
            horizontalLayoutCount: isSelectedFlatBottomBag ? `${ horizontalLayoutCount }/${ horizontalLayoutCountSide }` : `${ horizontalLayoutCount }`,
            numOfBagsPerPrinting: isSelectedFlatBottomBag ? `${ numOfBagsPerPrinting }/${ numOfBagsPerPrintingSide }` : `${ numOfBagsPerPrinting }`,
            printingLength: isSelectedFlatBottomBag ? `${ printingLength }/${ printingLengthSide }` : `${ printingLength }`,
            printingQuantity: isSelectedFlatBottomBag ? `${ printingQuantity }/${ printingQuantitySide }` : `${ printingQuantity }`
          }
        });
      }
      await post<NewQuotationHistory[]>(`/quotation-histories/${user.id}`, newQuotationHistories);
      return newQuotationHistories.map(({totalPriceInCNY}) => totalPriceInCNY);
  }
);

export const calculateTotalPriceByOffsetPrinting = createAsyncThunk<number[], TotalPriceCalculationParams>(
  "calculation/calculateTotalPriceByOffsetPrinting",
  async (params: TotalPriceCalculationParams, {getState}): Promise<number[]> => {
    const { categoryProductSubcategoryId, categoryPrintingTypeId, width, height, gusset, cases, options } = params;
    if (!width || !height) {
      return [];
    }
    const user: Customer | undefined = (getState() as RootState).customers.user;
    if (!user) {
      return [];
    }
    const categoryProductSubcategory: CategoryProductSubcategory | undefined = (getState() as RootState).categories.productSubcategories.find(({id}) => id === categoryProductSubcategoryId);
    if (!categoryProductSubcategory) {
      return [];
    }
    const categoryPrintingType: CategoryPrintingType | undefined = (getState() as RootState).categories.printingTypes.find(({id}) => id === categoryPrintingTypeId);
    if (!categoryPrintingType) {
      return [];
    }
    const exchangeRateValue: number = (getState() as RootState).env.exchangeRate?.rate || 1;
    const newQuotationHistories: NewQuotationHistory[] = [];
    for (const baseCase of cases) {
      if (!baseCase.numOfMatchedModulus || !baseCase.matchedPerimeter) {
        return [];
      }
      // Printing Cost
      const numOfSKUs4Printing: number = Math.ceil(baseCase.numOfStyles / baseCase.numOfMatchedModulus) * baseCase.numOfMatchedModulus;
      let multiple: number = 0;
      if (baseCase.numOfStyles % baseCase.numOfMatchedModulus === 0) {
        multiple = baseCase.numOfStyles / baseCase.numOfMatchedModulus - 1;
      } else {
        multiple = Math.floor(baseCase.numOfStyles / baseCase.numOfMatchedModulus);
      }
      let printingLength: number = 0;
      if (baseCase.numOfStyles <= baseCase.numOfMatchedModulus) {
        if (baseCase.numOfStyles === 1 || baseCase.numOfMatchedModulus % baseCase.numOfStyles === 0) {
          printingLength = (width + 10) * baseCase.totalQuantity / 1000 + 250;
        } else {
          printingLength = (width + 10) * baseCase.totalQuantity / baseCase.numOfStyles * baseCase.numOfMatchedModulus / 1000 + 250;
        }
      } else {
        const multipleLength: number = (width + 10) * baseCase.quantityPerStyle * baseCase.numOfMatchedModulus / 1000 + 250;
        let remainderLength: number = 0;
        if (baseCase.numOfStyles - multiple * baseCase.numOfMatchedModulus === 1 || baseCase.numOfMatchedModulus % (baseCase.numOfStyles - multiple * baseCase.numOfMatchedModulus) === 0) {
          remainderLength = (width + 10) * baseCase.quantityPerStyle * (baseCase.numOfStyles - multiple * baseCase.numOfMatchedModulus) / 1000 + 250;
        } else {
          remainderLength = (width + 10) * baseCase.quantityPerStyle * baseCase.numOfMatchedModulus / 1000 + 250;
        }
        printingLength = multipleLength * multiple + remainderLength;
      }

      let printingCost: number = 0;
      if (baseCase.numOfStyles <= baseCase.numOfMatchedModulus) {
        if (printingLength <= 1000) {
          printingCost = 1300;
        } else {
          printingCost = 1300 + (printingLength - 1000) * 0.2;
        }
      } else {
        const multipleLength: number = (width + 10) * baseCase.quantityPerStyle * baseCase.numOfMatchedModulus / 1000 + 250;
        let remainderLength: number = 0;
        if (baseCase.numOfStyles - multiple * baseCase.numOfMatchedModulus === 1 || baseCase.numOfMatchedModulus % (baseCase.numOfStyles - multiple * baseCase.numOfMatchedModulus) === 0) {
          remainderLength = (width + 10) * baseCase.quantityPerStyle * (baseCase.numOfStyles - multiple * baseCase.numOfMatchedModulus) / 1000 + 250;
        } else {
          remainderLength = (width + 10) * baseCase.quantityPerStyle * baseCase.numOfMatchedModulus / 1000 + 250;
        }
        let multipleLengthSinglePrintingCost: number = 0;
        if (multipleLength <= 1000) {
          multipleLengthSinglePrintingCost = 1300;
        } else {
          multipleLengthSinglePrintingCost = 1300 + (multipleLength - 1000) * 0.2;
        }
        let remainderLengthPrintingCost: number = 0;
        if (remainderLength <= 1000) {
          remainderLengthPrintingCost = 1300;
        } else {
          remainderLengthPrintingCost = 1300 + (remainderLength - 1000) * 0.2;
        }
        printingCost = multipleLengthSinglePrintingCost * multiple + remainderLengthPrintingCost;
      }
      if (
        ["3 side seal bag", "stand-up bag", "4 side seal bag", "flat bottoom bag"].includes(categoryProductSubcategory.name.toLowerCase())
        && CalculationUtil.getProductionProcessSuboptionByName("Inner printing", options)
      ) {
        printingCost *= 2;
      }
      if (["3 side seal bag", "stand-up bag"].includes(categoryProductSubcategory.name.toLowerCase())) {
        if (CalculationUtil.getProductionProcessSuboptionByName("UV", options)) {
          let uvCost: number = 0;
          if (baseCase.numOfStyles <= baseCase.numOfMatchedModulus) {
            uvCost = printingLength > 300 ? 500 + printingLength - 300 : 500;
          } else {
            const multipleLength: number = (width + 10) * baseCase.quantityPerStyle * baseCase.numOfMatchedModulus / 1000 + 250;
            let remainderLength: number = 0;
            if (baseCase.numOfStyles - multiple * baseCase.numOfMatchedModulus === 1 || baseCase.numOfMatchedModulus % (baseCase.numOfStyles - multiple * baseCase.numOfMatchedModulus) === 0) {
              remainderLength = (width + 10) * baseCase.quantityPerStyle * (baseCase.numOfStyles - multiple * baseCase.numOfMatchedModulus) / 1000 + 250;
            } else {
              remainderLength = (width + 10) * baseCase.quantityPerStyle * baseCase.numOfMatchedModulus / 1000 + 250;
            }
            const multipleLengthSingleUvCost: number = multipleLength > 300 ? 500 + multipleLength - 300 : 500;
            const remainderLengthUvCost: number = remainderLength > 300 ? 500 + remainderLength - 300 : 500;
            uvCost = multipleLengthSingleUvCost * multiple + remainderLengthUvCost;
          }
          printingCost += uvCost;
        }
        if (CalculationUtil.getProductionProcessSuboptionByName("Gold stamping", options)) {
          let goldStampingCost: number = 0;
          if (baseCase.numOfStyles <= baseCase.numOfMatchedModulus) {
            goldStampingCost = printingLength > 300 ? 900 + 1.5 * (printingLength - 300) : 900;
          } else {
            const multipleLength: number = (width + 10) * baseCase.quantityPerStyle * baseCase.numOfMatchedModulus / 1000 + 250;
            let remainderLength: number = 0;
            if (baseCase.numOfStyles - multiple * baseCase.numOfMatchedModulus === 1 || baseCase.numOfMatchedModulus % (baseCase.numOfStyles - multiple * baseCase.numOfMatchedModulus) === 0) {
              remainderLength = (width + 10) * baseCase.quantityPerStyle * (baseCase.numOfStyles - multiple * baseCase.numOfMatchedModulus) / 1000 + 250;
            } else {
              remainderLength = (width + 10) * baseCase.quantityPerStyle * baseCase.numOfMatchedModulus / 1000 + 250;
            }
            const multipleLengthSingleGoldStampingCost: number = multipleLength > 300 ? 900 + 1.5 * (multipleLength - 300) : 900;
            const remainderLengthGoldStampingCost: number = remainderLength > 300 ? 900 + 1.5 * (remainderLength - 300) : 900;
            goldStampingCost = multipleLengthSingleGoldStampingCost * multiple + remainderLengthGoldStampingCost;
          }
          printingCost += goldStampingCost;
        }
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
      const zipperTypeOption: CategoryOption | undefined = options.filter((option: CategoryOption) => option.name.toLowerCase() === "zipper type")[0];
      const zipperTypeName: string = ((zipperTypeOption as CategoryOption<false>)?.suboptions.map((suboption: CategorySuboption) => suboption.name)[0] || "No Zipper").toLowerCase();
      let edgeWidth: number = 100;
      if (baseCase.numOfStyles <= baseCase.numOfMatchedModulus) {
        if (["no zipper", "normal zipper"].includes(zipperTypeName)) {
          if (customShaped) {
            bagMakingCost = printingLength > 1000 ? 0.45 * printingLength : 450;
          } else {
            bagMakingCost = printingLength > 1000 ? 0.3 * printingLength : 300;
          }
        } else if (["cr zipper", "easy-tear zipper", "degradable zipper", "bone zipper", "powder zipper", "slider zipper", "velcro zipper"].includes(zipperTypeName)) {
          if (customShaped) {
            bagMakingCost = printingLength > 1000 ? 0.55 * printingLength : 550;
          } else {
            bagMakingCost = printingLength > 1000 ? 0.45 * printingLength : 450;
          }
        }
        if (width < edgeWidth) {
          if (baseCase.numOfMatchedModulus % baseCase.numOfStyles === 0) {
            bagMakingCost = Math.max(bagMakingCost, 0.02 * baseCase.totalQuantity);
          } else {
            bagMakingCost = Math.max(bagMakingCost, 0.02 * baseCase.quantityPerStyle * baseCase.numOfMatchedModulus);
          }
        }
      } else {
        const multipleLength: number = (width + 10) * baseCase.quantityPerStyle * baseCase.numOfMatchedModulus / 1000 + 250;
        let remainderLength: number = 0;
        if (baseCase.numOfStyles - multiple * baseCase.numOfMatchedModulus === 1 || baseCase.numOfMatchedModulus % (baseCase.numOfStyles - multiple * baseCase.numOfMatchedModulus) === 0) {
          remainderLength = (width + 10) * baseCase.quantityPerStyle * (baseCase.numOfStyles - multiple * baseCase.numOfMatchedModulus) / 1000 + 250;
        } else {
          remainderLength = (width + 10) * baseCase.quantityPerStyle * baseCase.numOfMatchedModulus / 1000 + 250;
        }
        let multipleLengthSinglePrintingCost: number = 0;
        if (["no zipper", "normal zipper"].includes(zipperTypeName)) {
          if (customShaped) {
            multipleLengthSinglePrintingCost = multipleLength > 1000 ? 0.45 * multipleLength : 450;
          } else {
            multipleLengthSinglePrintingCost = multipleLength > 1000 ? 0.3 * multipleLength : 300;
          }
        } else if (["cr zipper", "easy-tear zipper", "degradable zipper", "bone zipper", "powder zipper", "slider zipper", "velcro zipper"].includes(zipperTypeName)) {
          if (customShaped) {
            multipleLengthSinglePrintingCost = multipleLength > 1000 ? 0.55 * multipleLength : 550;
          } else {
            multipleLengthSinglePrintingCost = multipleLength > 1000 ? 0.45 * multipleLength : 450;
          }
        }
        if (width < edgeWidth) {
          multipleLengthSinglePrintingCost = Math.max(multipleLengthSinglePrintingCost, 0.02 * baseCase.quantityPerStyle * baseCase.numOfMatchedModulus);
        }
        let remainderLengthPrintingCost: number = 0;
        if (["no zipper", "normal zipper"].includes(zipperTypeName)) {
          if (customShaped) {
            remainderLengthPrintingCost = remainderLength > 1000 ? 0.45 * remainderLength : 450;
          } else {
            remainderLengthPrintingCost = remainderLength > 1000 ? 0.3 * remainderLength : 300;
          }
        } else if (["cr zipper", "easy-tear zipper", "degradable zipper", "bone zipper", "powder zipper", "slider zipper", "velcro zipper"].includes(zipperTypeName)) {
          if (customShaped) {
            remainderLengthPrintingCost = remainderLength > 1000 ? 0.55 * remainderLength : 550;
          } else {
            remainderLengthPrintingCost = remainderLength > 1000 ? 0.45 * remainderLength : 450;
          }
        }
        if (width < edgeWidth) {
          if (baseCase.numOfMatchedModulus % (baseCase.numOfStyles - multiple * baseCase.numOfMatchedModulus) === 0) {
            remainderLengthPrintingCost = Math.max(remainderLengthPrintingCost, 0.02 * baseCase.quantityPerStyle * (baseCase.numOfStyles - multiple * baseCase.numOfMatchedModulus));
          } else {
            remainderLengthPrintingCost = Math.max(remainderLengthPrintingCost, 0.02 * baseCase.quantityPerStyle * baseCase.numOfMatchedModulus);
          }
        }
        bagMakingCost = multipleLengthSinglePrintingCost * multiple+ remainderLengthPrintingCost;
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

      const {categoryAllMappings, materials} = CalculationUtil.splitCatgeoryOptions(categoryProductSubcategory, categoryPrintingType, options);

      newQuotationHistories.push({
        customerId: user.id,
        categoryProductSubcategoryId: categoryProductSubcategoryId,
        categoryPrintingTypeId: categoryPrintingTypeId,
        width: `${ width }`,
        height: `${ height }`,
        gusset: `${ gusset || "" }`,
        numOfStyles: `${ baseCase.numOfStyles }`,
        quantityPerStyle: `${ baseCase.quantityPerStyle }`,
        totalQuantity: `${ baseCase.totalQuantity }`,
        categoryAllMappings: categoryAllMappings,
        materialDisplays: materials.map(({displays}) => displays[0]),
        totalCostInCNY: totalCostInCNY,
        totalPriceInCNY: totalPriceInCNY,
        totalPriceInUSD: totalPriceInCNY / exchangeRateValue,
        exchangeRateUSDToCNY: exchangeRateValue,
        materialArea: `${ materialArea }`,
        printingCost: `${ printingCost }`,
        materialCost: `${ materialCost }`,
        laminationCost: "",
        bagMakingCost: `${ bagMakingCost }`,
        dieCuttingCost: `${ dieCuttingCost }`,
        packagingCost: `${ packagingCost }`,
        laborCost: laborCost,
        fileProcessingFee: fileProcessingFee,
        offsetPrinting: {
          numOfMatchedModulus: `${ baseCase.numOfMatchedModulus }`,
          matchedPerimeter: `${ baseCase.matchedPerimeter }`,
          multiple: `${ multiple }`,
          numOfSKUs4Printing: `${ numOfSKUs4Printing }`,
          printingWidth: `${ printingWidth }`,
          materialWidth: `${ materialWidth }`,
          printingLength: `${ printingLength }`
        }
      });
    }
    await post<NewQuotationHistory[]>(`/quotation-histories/${user.id}`, newQuotationHistories);
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
    const categoryProductSubcategory: CategoryProductSubcategory | undefined = (getState() as RootState).categories.productSubcategories.find(({id}) => id === categoryProductSubcategoryId);
    if (!categoryProductSubcategory) {
      return [];
    }
    const categoryPrintingType: CategoryPrintingType | undefined = (getState() as RootState).categories.printingTypes.find(({id}) => id === categoryPrintingTypeId);
    if (!categoryPrintingType) {
      return [];
    }
    const isSelectedFlatBottomBag: boolean = categoryProductSubcategory.name.toLowerCase() === "flat bottoom bag";
    const exchangeRateValue: number = (getState() as RootState).env.exchangeRate?.rate || 1;
    const newQuotationHistories: NewQuotationHistory[] = [];
    for (const baseCase of cases) {
      // Material Cost
      let printingLengthPerPackage: number = 0;
      let printingLengthPerPackageSide: number = 0;
      if (["3 side seal bag", "stand-up bag"].includes(categoryProductSubcategory.name.toLowerCase())) {
        printingLengthPerPackage = width + 5;
      } else if (categoryProductSubcategory.name.toLowerCase() === "4 side seal bag") {
        printingLengthPerPackage = height + 5;
      } else if (isSelectedFlatBottomBag) {
        printingLengthPerPackage = width + 5;
        printingLengthPerPackageSide = height + 5;
      } else {
        printingLengthPerPackage = (width + 2.5) * 2;
      }
      const customShaped: boolean = CalculationUtil.isCustomShaped(options);
      let materialWidth: number = 0;
      let materialWidthSide: number = 0;
      if (categoryProductSubcategory.name.toLowerCase() === "4 side seal bag") {
        materialWidth = (width + (gusset || 0) + 20) * 2;
      } else {
        materialWidth = customShaped ? (height + 20) * 2 + (gusset || 0) : (height + 10) * 2 + (gusset || 0);
      }
      if (isSelectedFlatBottomBag) {
        materialWidthSide = ((gusset || 0) + 10) * 2;
      }
      const materialArea: number = (printingLengthPerPackage * materialWidth * baseCase.totalQuantity) / 1000000;
      let materialAreaSide: number = 0;
      if (isSelectedFlatBottomBag) {
        materialAreaSide = (printingLengthPerPackageSide * materialWidthSide * baseCase.totalQuantity) / 1000000;
      }
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
      let materialCostSide: number = 0;
      if (isSelectedFlatBottomBag) {
        materialCostSide = materialAreaSide * totalMaterialUnitPricePerSquareMeter;
      }
      console.log("printingLengthPerPackage: ", printingLengthPerPackage);
      console.log("printingLengthPerPackageSide: ", printingLengthPerPackageSide);
      console.log("materialWidth: ", materialWidth);
      console.log("materialWidthSide: ", materialWidthSide);
      console.log("totalMaterialUnitPricePerSquareMeter: ", totalMaterialUnitPricePerSquareMeter);
      console.log("materialArea: ", materialArea);
      console.log("materialAreaSide: ", materialAreaSide);
      console.log("materialCost: ", materialCost);
      console.log("materialCostSide: ", materialCostSide);

      // Printing Cost
      let totalUnitPricePerSquareMeter: number = 0;
      for (let i: number = 0; i < options.length; ++i) {
        const option: CategoryOption = options[i];
        if (!option.isMaterial && ["color", "production process"].includes(option.name.toLowerCase())) {
          const suboptions: CategorySuboption[] = (option as CategoryOption<false>).suboptions;
          for (let j: number = 0; j < suboptions.length; ++j) {
            totalUnitPricePerSquareMeter += suboptions[j].unitPricePerSquareMeter;
          }
        }
      }
      let printingCost: number = Math.max(materialArea * totalUnitPricePerSquareMeter, 500);
      if (
        ["3 side seal bag", "stand-up bag", "4 side seal bag", "flat bottoom bag"].includes(categoryProductSubcategory.name.toLowerCase())
        && CalculationUtil.getProductionProcessSuboptionByName("Inner printing", options)
      ) {
        printingCost *= 2;
      }
      let printingCostSide: number = 0;
      if (isSelectedFlatBottomBag) {
        printingCostSide = Math.max(materialAreaSide * totalUnitPricePerSquareMeter, 500);
      }
      console.log("printingCost: ", printingCost);
      console.log("printingCostSide: ", printingCostSide);

      // Composite Processing Fee
      let numOfLaminationLayers: number = 0;
      const laminationLayerOption: CategoryOption | undefined = options.filter((option: CategoryOption) => option.name.toLowerCase() === "layer material")[0];
      if (laminationLayerOption) {
        numOfLaminationLayers = (laminationLayerOption as CategoryOption<true>).suboptions.filter((materialItem: CategoryMaterialItem | undefined) => !!materialItem).length;
      }
      const laminationCost: number = (0.25 + 0.15 * numOfLaminationLayers) * materialArea;
      let laminationCostSide: number = 0;
      if (isSelectedFlatBottomBag) {
        laminationCostSide = (0.25 + 0.15 * numOfLaminationLayers) * materialAreaSide;
      }
      console.log("laminationCost: ", laminationCost);
      console.log("laminationCostSide: ", laminationCostSide);

      // Bag Making Cost
      let totalProductionProcessUnitPricePerSquareMeter: number = 0;
      for (let i: number = 0; i < options.length; ++i) {
        const option: CategoryOption = options[i];
        if (!option.isMaterial && option.name.toLowerCase() === "production process") {
          for (let j: number = 0; j < option.suboptions.length; ++j) {
            const suboption: CategorySuboption = (option as CategoryOption<false>).suboptions[j];
            if (["spout", "valve"].includes(suboption.name.toLowerCase())) {
              totalProductionProcessUnitPricePerSquareMeter += suboption.unitPricePerSquareMeter;
            }
          }
        }
      }
      let bagMakingCost: number = 0;
      const selectedZipperSuboption: CategorySuboption | undefined = CalculationUtil.getSelectedZipperSuboption(options);
      if (isSelectedFlatBottomBag) {
        if (!selectedZipperSuboption || selectedZipperSuboption.name.toLowerCase() === "no zipper") {
          bagMakingCost = 0.5 * printingLengthPerPackage * baseCase.totalQuantity / 1000 + baseCase.totalQuantity * totalProductionProcessUnitPricePerSquareMeter;
        } else {
          bagMakingCost = 0.6 * printingLengthPerPackage * baseCase.totalQuantity / 1000 + baseCase.totalQuantity * totalProductionProcessUnitPricePerSquareMeter;
        }
      } else {
        bagMakingCost = 0.2 * materialArea + (selectedZipperSuboption?.unitPricePerSquareMeter || 0) * printingLengthPerPackage * baseCase.totalQuantity / 1000 + baseCase.totalQuantity * totalProductionProcessUnitPricePerSquareMeter;
      }
      bagMakingCost = Math.max(bagMakingCost, 1600);
      console.log("bagMakingCost: ", bagMakingCost);

      // Plate Fee
      let numOfPlate: number = 0;
      for (let i: number = 0; i < options.length; ++i) {
        const option: CategoryOption = options[i];
        if (!option.isMaterial && option.name.toLowerCase() === "color") {
          numOfPlate = Number(((option as CategoryOption<false>).suboptions[0].name.match(/(\d+)\s*colors?/) || [])[1] || 0);
        }
      }
      let unitPlateCost: number = 0;
      let bottomCompensation: number = 0;
      if (height < 200) {
        unitPlateCost = 450;
      } else if (height >= 200 && height < 250) {
        unitPlateCost = 500;
        bottomCompensation = 800;
      } else if (height >= 250 && height < 350) {
        unitPlateCost = 600;
        bottomCompensation = 800;
      } else if (height >= 350 && height < 400) {
        unitPlateCost = 800;
        bottomCompensation = 800;
      } else if (height >= 400 && height <= 500) {
        unitPlateCost = 10000;
        bottomCompensation = 800;
      } else {
        throw new Error("The bag height exceeds the limit, please contact the sales for quote.");
      }
      let plateFee: number = 0;
      if (isSelectedFlatBottomBag) {
        plateFee = numOfPlate * 2 * unitPlateCost + bottomCompensation + (customShaped ? 1500 : 0);
      } else {
        plateFee = numOfPlate * unitPlateCost + bottomCompensation + (customShaped ? 1500 : 0);
      }
      // const plateFee: number = numOfPlate * 450;
      console.log("plateFee: ", plateFee);

      // Packaging Cost
      const packagingCost: number = Math.ceil(baseCase.totalQuantity / 2000) * 10;
      console.log("packagingCost: ", packagingCost);

      // Plate Length
      let plateLength: number = 0;
      let plateLengthSide: number = 0;
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
        throw new Error("Please contact sales for quote.");
      }
      if (isSelectedFlatBottomBag) {
        if (materialWidthSide <= 600) {
          plateLengthSide = 650;
        } else if (materialWidthSide <= 700) {
          plateLengthSide = 750;
        } else if (materialWidthSide <= 800) {
          plateLengthSide = 850;
        } else if (materialWidthSide <= 900) {
          plateLengthSide = 950;
        } else if (materialWidthSide <= 1050) {
          plateLengthSide = 1100;
        } else {
          throw new Error("Please contact sales for quote.");
        }
      }

      const platePerimeter: number = Math.min(Math.ceil(400 / printingLengthPerPackage) * printingLengthPerPackage, 800);
      const platePerimeterSide: number = printingLengthPerPackageSide === 0 ? 0 : Math.min(Math.ceil(400 / printingLengthPerPackageSide) * printingLengthPerPackageSide, 800);

      console.log("isSelectedFlatBottomBag: ", isSelectedFlatBottomBag);
      const totalCostInCNY: number = ((isSelectedFlatBottomBag ? 1.55 : 1.35) * materialCost + printingCost + printingCostSide + laminationCost + laminationCostSide + bagMakingCost + plateFee + packagingCost) * 1.08;
      const totalPriceInCNY: number = calculateProfitMargin(totalCostInCNY, "Gravure printing", user?.tier);

      const {categoryAllMappings, materials} = CalculationUtil.splitCatgeoryOptions(categoryProductSubcategory, categoryPrintingType, options);

      newQuotationHistories.push({
        customerId: user.id,
        categoryProductSubcategoryId: categoryProductSubcategoryId,
        categoryPrintingTypeId: categoryPrintingTypeId,
        width: `${ width }`,
        height: `${ height }`,
        gusset: `${ gusset || "" }`,
        numOfStyles: `${ baseCase.numOfStyles }`,
        quantityPerStyle: `${ baseCase.quantityPerStyle }`,
        totalQuantity: `${ baseCase.totalQuantity }`,
        categoryAllMappings: categoryAllMappings,
        materialDisplays: materials.map(({displays}) => displays[0]),
        totalCostInCNY: totalCostInCNY,
        totalPriceInCNY: totalPriceInCNY,
        totalPriceInUSD: totalPriceInCNY / exchangeRateValue,
        exchangeRateUSDToCNY: exchangeRateValue,
        materialArea: !materialAreaSide ? `${ materialArea }` : `${ materialArea }/${ materialAreaSide }`,
        printingCost: !printingCostSide ? `${ printingCost }` : `${ printingCost }/${ printingCostSide }`,
        materialCost: !materialCostSide ? `${ materialCost }` : `${ materialCost }/${ materialCostSide }`,
        laminationCost: !laminationCostSide ? `${ laminationCost }` : `${ laminationCost }/${ laminationCostSide }`,
        bagMakingCost: `${ bagMakingCost }`,
        dieCuttingCost: "",
        packagingCost: `${ packagingCost }`,
        laborCost: 0,
        fileProcessingFee: 0,
        gravurePrinting: {
          materialWidth: !materialWidthSide ? `${ materialWidth }` : `${ materialWidth }/${ materialWidthSide }`,
          plateLength: !plateLengthSide ? `${ plateLength }` : `${ plateLength }/${ plateLengthSide }`,
          printingLengthPerPackage: printingLengthPerPackageSide === 0 ? `${ printingLengthPerPackage }` : `${ printingLengthPerPackage }/${ printingLengthPerPackageSide }`,
          platePerimeter: !platePerimeterSide ? `${ platePerimeter }` : `${ platePerimeter }/${ platePerimeterSide }`,
          plateFee: `${ plateFee }`
        }
      });
    }
    await post<NewQuotationHistory[]>(`/quotation-histories/${user.id}`, newQuotationHistories);
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
    const productSubcategories: CategoryProductSubcategory[] = (getState() as RootState).categories.productSubcategories;
    const selectedProductSubcategory: CategoryProductSubcategory | undefined = productSubcategories.filter((productSubcategory: CategoryProductSubcategory) => productSubcategory.id === categoryProductSubcategoryId)[0];
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
          case "flat bottoom bag":
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
    [calculateTotalPriceByDigitalPrinting, calculateTotalPriceByOffsetPrinting, calculateTotalPriceByGravurePrinting].forEach((asyncThunk) => {
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