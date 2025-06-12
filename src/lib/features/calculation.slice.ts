import { ActionReducerMapBuilder, createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { CategoryMaterialSuboption, CategoryOption, CategorySuboption, ProductSubcategory } from "./categories.slice";
import CalculationUtil from "@/app/utils/CalculationUtil";
import { RootState } from "../store";

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

type TotalPriceCalculationParams = Size & { cases: BaseCaseValue[]; options: CategoryOption<boolean>[]; };
type TotalWeightCalculationParams = TotalPriceCalculationParams;

export const calculateTotalPriceByGravurePrinting = createAsyncThunk<number[], TotalPriceCalculationParams & { selectedProductSubcategoryId: number }>(
  "calculation/calculateTotalPriceByGravurePrinting",
  async (params: TotalPriceCalculationParams & { selectedProductSubcategoryId: number }, {getState}): Promise<number[]> => {
    const { width, height, gusset, cases, options, selectedProductSubcategoryId } = params;
    if (!width || !height) {
      return [];
    }
    const totalPrices: number[] = [];
    for (const baseCase of cases) {
      // Material Cost
      const printingLengthPerPackage: number = (width + 2.5) * 2;
      const customShaped: boolean = CalculationUtil.isCustomShaped(options);
      const materialWidth: number = customShaped ? (height + 20) * 2 + (gusset || 0) : (height + 10) * 2 + (gusset || 0);
      let materialArea: number = (printingLengthPerPackage * materialWidth * baseCase.totalQuantity) / 1000000;
      let totalMaterialUnitPrice: number = 0;
      for (let i: number = 0; i < options.length; ++i) {
        const option: CategoryOption = options[i];
        if (option.isMaterial) {
          const materialSuboptions: (CategoryMaterialSuboption | undefined)[] = (option as CategoryOption<true>).suboptions;
          for (let j: number = 0; j < materialSuboptions.length; ++j) {
            // totalUnitPrice += suboptions[j].unitPrice;
            const materialSuboption: CategoryMaterialSuboption | undefined = materialSuboptions[j];
            if (materialSuboption) {
              const suboptions: CategorySuboption[] = materialSuboption.suboptions;
              for (let n: number = 0; n < suboptions.length; ++n) {
                totalMaterialUnitPrice += suboptions[n].unitPrice;
              }
            }
          }
        }
      }
      const materialCost: number = materialArea * totalMaterialUnitPrice;

      // Printing Cost
      let totalUnitPrice: number = 0;
      for (let i: number = 0; i < options.length; ++i) {
        const option: CategoryOption = options[i];
        if (!option.isMaterial && ["color", "production process"].includes(option.name.toLocaleLowerCase())) {
          const suboptions: CategorySuboption[] = (option as CategoryOption<false>).suboptions;
          for (let j: number = 0; j < suboptions.length; ++j) {
            totalUnitPrice += suboptions[j].unitPrice;
          }
        }
      }
      const printingCost: number = materialArea * totalUnitPrice;

      // Composite Processing Fee
      let numOfLaminationLayers: number = 0;
      const laminationLayerOption: CategoryOption | undefined = options.filter((option: CategoryOption) => option.name.toLocaleLowerCase() === "layer material")[0];
      if (laminationLayerOption) {
        numOfLaminationLayers = (laminationLayerOption as CategoryOption<true>).suboptions.filter((materialSuboption: CategoryMaterialSuboption | undefined) => !!materialSuboption).length;
      }
      const laminationCost: number = (0.25 + 0.15 * numOfLaminationLayers) * materialArea;

      // Bag Making Cost
      const productSubcategories: ProductSubcategory[] = (getState() as RootState).categories.productSubcategories;
      const selectedProductSubcategory: ProductSubcategory | undefined = productSubcategories.filter((productSubcategory: ProductSubcategory) => productSubcategory.id === selectedProductSubcategoryId)[0];
      let totalProductionProcessUnitPrice: number = 0;
      for (let i: number = 0; i < options.length; ++i) {
        const option: CategoryOption = options[i];
        if (!option.isMaterial && option.name.toLocaleLowerCase() === "production process") {
          for (let j: number = 0; j < option.suboptions.length; ++j) {
            const suboption: CategorySuboption = (option as CategoryOption<false>).suboptions[j];
            if (["spout", "valve"].includes(suboption.name.toLocaleLowerCase())) {
              totalProductionProcessUnitPrice += suboption.unitPrice;
            }
          }
        }
      }
      let bagMakingCost: number = 0;
      const selectedZipperSuboption: CategorySuboption | undefined = CalculationUtil.getSelectedZipperSuboption(options);
      const isSelectedsquareBottomBag: boolean = selectedProductSubcategory && selectedProductSubcategory.name.toLocaleLowerCase() === "square bottom bag";
      if (isSelectedsquareBottomBag) {
        if (!selectedZipperSuboption || selectedZipperSuboption.name.toLocaleLowerCase() === "no zipper") {
          bagMakingCost = 0.5 * printingLengthPerPackage * baseCase.totalQuantity / 1000 + baseCase.totalQuantity * totalProductionProcessUnitPrice;
        } else {
          bagMakingCost = 0.6 * printingLengthPerPackage * baseCase.totalQuantity / 1000 + baseCase.totalQuantity * totalProductionProcessUnitPrice;
        }
      } else {
        bagMakingCost = 0.2 * materialArea + (selectedZipperSuboption?.unitPrice || 0) * printingLengthPerPackage * baseCase.totalQuantity / 1000 + baseCase.totalQuantity * totalProductionProcessUnitPrice;
      }

      // Plate Fee
      let numOfPlate: number = 0;
      for (let i: number = 0; i < options.length; ++i) {
        const option: CategoryOption = options[i];
        if (!option.isMaterial && ["color", "production process"].includes(option.name.toLocaleLowerCase())) {
          // const suboptions: CategorySuboption[] = (option as CategoryOption<false>).suboptions;
          numOfPlate += ((option as CategoryOption<false>).suboptions || []).filter((suboption: CategorySuboption) => !!suboption).length;
        }
      }
      const plateFee: number = numOfPlate * 450;

      // Packaging Cost
      const packagingCost: number = Math.ceil(baseCase.totalQuantity / 2000) * 10;

      if (isSelectedsquareBottomBag) {
        totalPrices.push(1.55 * materialCost + printingCost + laminationCost + bagMakingCost + plateFee + packagingCost);
      } else {
        totalPrices.push(1.35 * materialCost + printingCost + laminationCost + bagMakingCost + plateFee + packagingCost);
      }
    }
    return totalPrices;
  }
);

export const calculateTotalWeight = createAsyncThunk<number[], TotalWeightCalculationParams & { selectedProductSubcategoryId: number }>(
  "calculation/calculateTotalWeight",
  async (params: TotalPriceCalculationParams & { selectedProductSubcategoryId: number }, {getState}): Promise<number[]> => {
    const { width, height, cases, options, selectedProductSubcategoryId } = params;
    if (!width || !height) {
      return cases.map(() => 0);
    }
    const productSubcategories: ProductSubcategory[] = (getState() as RootState).categories.productSubcategories;
    const selectedProductSubcategory: ProductSubcategory | undefined = productSubcategories.filter((productSubcategory: ProductSubcategory) => productSubcategory.id === selectedProductSubcategoryId)[0];
    if (selectedProductSubcategory) {
      let surfaceDensity: number = 0;
      for (const option of options) {
        if (option.isMaterial) {
          for (const materialSuboption of (option as CategoryOption<true>).suboptions) {
            if (materialSuboption) {
              for (const suboption of materialSuboption.suboptions) {
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
    calculateTotalPriceByDigitalPrinting: (state: CalculationState, action: PayloadAction<TotalPriceCalculationParams>) => {
      const { width, height, gusset, cases, options } = action.payload;
      if (!width || !height) {
        state.totalPrices = [];
        return;
      }
      const totalPrices: number[] = [];
      for (const baseCase of cases) {
        // Printing Cost
        const printingWidth: number = (height + 10) * 2 + (gusset || 0);
        const horizontalLayoutCount: number = Math.floor(740 / printingWidth);
        const numOfBagsPerImpression: number = Math.floor(1120 / (width + 5));
        const printingQuantity: number = baseCase.totalQuantity / horizontalLayoutCount / numOfBagsPerImpression;
        const printingCost: number = printingQuantity * 3.8;

        // Material Cost
        const printingLength: number = baseCase.totalQuantity / horizontalLayoutCount * (width + 5) / 1000 * (1.1 + (baseCase.numOfStyles - 1) * 0.5) + 50;
        const materialArea: number = printingLength * 760 / 1000;
        let totalUnitPrice: number = 0;
        for (let i: number = 0; i < options.length; ++i) {
          const option: CategoryOption = options[i];
          if (option.isMaterial) {
            const materialSuboptions: (CategoryMaterialSuboption | undefined)[] = (option as CategoryOption<true>).suboptions;
            for (let j: number = 0; j < materialSuboptions.length; ++j) {
              const materialSuboption: CategoryMaterialSuboption | undefined = materialSuboptions[j];
              if (materialSuboption) {
                const suboptions: CategorySuboption[] = materialSuboption.suboptions;
                for (let n: number = 0; n < suboptions.length; ++n) {
                  totalUnitPrice += suboptions[n].unitPrice || 0;
                }
              }
            }
          } else {
            const suboptions: CategorySuboption[] = (option as CategoryOption<false>).suboptions;
            for (let n: number = 0; n < suboptions.length; ++n) {
              totalUnitPrice += suboptions[n].unitPrice || 0;
            }
          }
        }
        const materialCost: number = materialArea * totalUnitPrice;

        // Composite Processing Fee
        let numOfLaminationLayers: number = 0;
        const laminationLayerOption: CategoryOption | undefined = options.filter((option: CategoryOption) => option.name.toLocaleLowerCase() === "layer material")[0];
        if (laminationLayerOption) {
          numOfLaminationLayers = (laminationLayerOption as CategoryOption<true>).suboptions.filter((materialSuboption: CategoryMaterialSuboption | undefined) => !!materialSuboption).length;
        }
        const laminationCost: number = (0.25 + 0.15 * numOfLaminationLayers) * materialArea;

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

        // Die-Cutting Cost
        const dieCuttingCost: number = customShaped ? 600 : 0;

        // Packaging Cost
        const packagingCost: number = Math.ceil(baseCase.totalQuantity / 2000) * 10;

        totalPrices.push((printingCost + materialCost + laminationCost + bagMakingCost + dieCuttingCost + packagingCost) * 1.08);
      }
      state.totalPrices = totalPrices;
    },
    calculateTotalPriceByOffsetPrinting: (state: CalculationState, action: PayloadAction<TotalPriceCalculationParams & {numOfMatchedModulus: number}>) => {
      const { width, height, gusset, cases, numOfMatchedModulus, options } = action.payload;
      if (!width || !height) {
        state.totalPrices = [];
        return;
      }
      const totalPrices: number[] = [];
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
        
        // Material Cost
        const customShaped: boolean = CalculationUtil.isCustomShaped(options);
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
        let materialPrice: number = 0;
        for (let i: number = 0; i < options.length; ++i) {
          const option: CategoryOption = options[i];
          if (option.isMaterial) {
            const materialSuboptions: (CategoryMaterialSuboption | undefined)[] = (option as CategoryOption<true>).suboptions;
            for (let j: number = 0; j < materialSuboptions.length; ++j) {
              const materialSuboption: CategoryMaterialSuboption | undefined = materialSuboptions[j];
              if (materialSuboption) {
                const suboptions: CategorySuboption[] = materialSuboption.suboptions;
                for (let n: number = 0; n < suboptions.length; ++n) {
                  if (["触感膜", "拉丝膜"].includes(suboptions[n].chineseName)) {
                    materialPrice += 3.5 * materialArea;
                  } else {
                    materialPrice += 3 * materialArea;
                  }
                }
              }
            }
          } else {
            const suboptions: CategorySuboption[] = (option as CategoryOption<false>).suboptions;
            materialPrice += suboptions.length * 3 * materialArea;
          }
        }

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

        // Die-Cutting Cost
        const dieCuttingCost: number = customShaped ? 600 : 0;

        // Labor Cost
        const laborCost: number = baseCase.totalQuantity * 0.02;
        
        // Packaging Cost
        const packagingCost: number = Math.ceil(baseCase.totalQuantity / 2000) * 10;

        // File processing Fee
        const fileProcessingFee: number = baseCase.numOfStyles * 50;

        totalPrices.push((printingCost + materialPrice + bagMakingCost + dieCuttingCost + laborCost + packagingCost + fileProcessingFee) * 1.08);
      }
      state.totalPrices = totalPrices;
    },
  },
  extraReducers: (builder: ActionReducerMapBuilder<CalculationState>) => {
    builder.addCase(calculateTotalPriceByGravurePrinting.fulfilled, (state: CalculationState, action: PayloadAction<number[]>) => {
      state.totalPrices = action.payload;
    });
    builder.addCase(calculateTotalWeight.fulfilled, (state: CalculationState, action: PayloadAction<number[]>) => {
      state.totalWeights = action.payload;
    });
  }
});

export const {
  calculateTotalPriceByDigitalPrinting,
  calculateTotalPriceByOffsetPrinting
} = calculationSlice.actions;

export default calculationSlice.reducer;