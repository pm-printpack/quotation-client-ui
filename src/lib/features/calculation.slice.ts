import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { CategoryMaterialSuboption, CategoryOption, CategorySuboption } from "./categories.slice";

interface CalculationState {
  loading: boolean;
  totalPrices: number[];
}

const initialState: CalculationState = {
  loading: false,
  totalPrices: [0],
};

export type BaseCaseValue = {
  numOfStyles: number;
  quantityPerStyle: number;
  totalQuantity: number;
} & Record<string, number>;

export type Size = {
  width: number;
  height: number;
};

export const calculationSlice = createSlice({
  name: "calculation",
  initialState: initialState,
  reducers: {
    calculateTotalPriceByDigitalPrinting: (state: CalculationState, action: PayloadAction<Size & { cases: BaseCaseValue[] } & { options: CategoryOption<boolean>[] }>) => {
      const { width, height, cases, options } = action.payload;
      const totalPrices: number[] = [];
      for (const baseCase of cases) {
        // Printing Cost
        const fullBottomLayout: number = 0;
        const printingWidth: number = (height + 10) * 2 + fullBottomLayout;
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
        let customShaped: boolean = false;
        const productionProcessOption: CategoryOption | undefined = options.filter((option: CategoryOption) => option.name.toLocaleLowerCase() === "production process")[0];
        if (productionProcessOption) {
          const suboptions: CategorySuboption[] = (productionProcessOption as CategoryOption<false>).suboptions;
          customShaped = suboptions.filter((suboption: CategorySuboption) => suboption.name.toLocaleLowerCase() === "special shape").length > 0;
        }
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
    calculateTotalPriceByOffsetPrinting: (state: CalculationState, action: PayloadAction<Size & { cases: BaseCaseValue[] } & { options: CategoryOption<boolean>[] }>) => {
      const { width, height, cases, options } = action.payload;
      const totalPrices: number[] = [];
      for (const baseCase of cases) {
        // Printing Cost
        const numOfSKUs4Printing: number = Math.ceil(baseCase.numOfStyles / 1) * 1;
        const printingLength: number = (width + 10) * baseCase.totalQuantity / baseCase.numOfStyles * numOfSKUs4Printing / 1000 + 250;
        let printingCost: number = 0;
        if (printingLength <= 1000) {
          printingCost = 1300;
        } else {
          printingCost = 1300 + (printingLength - 1000) * 0.2;
        }
        
        // Material Cost
        let customShaped: boolean = false;
        const productionProcessOption: CategoryOption | undefined = options.filter((option: CategoryOption) => option.name.toLocaleLowerCase() === "production process")[0];
        if (productionProcessOption) {
          const suboptions: CategorySuboption[] = (productionProcessOption as CategoryOption<false>).suboptions;
          customShaped = suboptions.filter((suboption: CategorySuboption) => suboption.name.toLocaleLowerCase() === "special shape").length > 0;
        }
        let printingWidth: number = 0;
        if (customShaped) {
          printingWidth = (height + 10) * 2 + 10 + 14;
        } else {
          printingWidth = (height + 6) * 2 + 6 + 14;
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
    }
  }
});

export const {
  calculateTotalPriceByDigitalPrinting,
  calculateTotalPriceByOffsetPrinting
} = calculationSlice.actions;

export default calculationSlice.reducer;