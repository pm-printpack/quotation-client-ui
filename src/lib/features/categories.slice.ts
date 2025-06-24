import { useRequest } from "@/hooks/useRequest";
import { ActionReducerMapBuilder, createAsyncThunk, createSlice, PayloadAction, SerializedError } from "@reduxjs/toolkit";

const { get } = useRequest();

interface Category{
  id: number;
  name: string;
  chineseName: string;
  createdAt: Date;
};

export interface ProductSubcategory extends Category {
  hasGusset: boolean;
  isVisible: boolean;
}

export interface PrintingType extends Category {}

export interface CategoryMaterialItem {
  id: number;
  isVisible: boolean;
  suboptions: CategoryMaterialSuboption[];
}

export interface CategoryOption<T extends boolean = boolean> extends Category {
  isMaterial: T;
  isRequired: boolean;
  suboptions: T extends true ? (CategoryMaterialItem | undefined)[] : CategorySuboption[];
}

interface CategoryOptionFromService<T extends boolean = boolean> extends Category {
  isMaterial: T;
  isRequired: boolean;
  suboptions: T extends true ? CategoryMaterialSuboption[][] : CategorySuboption[];
}

export interface CategorySuboption extends Category {
  /**
   * Unit Price per Square Meter
   * CNY/m²
   */
  unitPricePerSquareMeter: number;
}

export interface CategoryMaterialSuboption extends CategorySuboption {
  density: number;
  thickness: number;

  /**
   * Unit Price per Kelogram
   * CNY/kg
   */
  unitPricePerKg: number;

  /**
   * Weight per square centimeter of material
   * The unit is g/cm²
   */
  weightPerCm2: number;
}

interface CategoriesState {
  loading: boolean;
  productSubcategories: ProductSubcategory[];
  printingTypes: PrintingType[];
  options: CategoryOption[];
}

const initialState: CategoriesState = {
  loading: false,
  productSubcategories: [],
  printingTypes: [],
  options: []
};

export const fetchAllProductSubcategories = createAsyncThunk<ProductSubcategory[], void>(
  "categories/fetchAllProductSubcategories",
  async (): Promise<ProductSubcategory[]> => {
    const {data, error} = await get<{}, ProductSubcategory[]>("/categories/product-subcategories");
    if (error) {
      throw error;
    }
    return data || [];
  }
);

export const fetchAllPrintingTypes = createAsyncThunk<PrintingType[], void>(
  "categories/fetchAllPrintingTypes",
  async (): Promise<PrintingType[]> => {
    const {data, error} = await get<{}, PrintingType[]>("/categories/printing-types");
    if (error) {
      throw error;
    }
    return data || [];
  }
);

type FetchCategoryOptionParams = {
  categoryProductSubcategoryId: number;
  categoryPrintingTypeId: number;
};

export const fetchCategoryOptions = createAsyncThunk<CategoryOptionFromService[], FetchCategoryOptionParams>(
  "categories/fetchCategoryOptions",
  async (params: FetchCategoryOptionParams): Promise<CategoryOptionFromService[]> => {
    const {data, error} = await get<{}, CategoryOptionFromService[]>(`/categories/options/${params.categoryProductSubcategoryId}/${params.categoryPrintingTypeId}`);
    if (error) {
      throw error;
    }
    return data || [];
  }
);

export const categoriesSlice = createSlice({
  name: "categories",
  initialState: initialState,
  reducers: {
    showMaterialItemsBySelectedOptions: (state: CategoriesState, action: PayloadAction<CategoryOption[]>) => {
      const options: CategoryOption[] = state.options;
      const selectedOptions: CategoryOption[] = action.payload;
      let hasChanged: boolean = false;
      for (let i: number = 0; i < selectedOptions.length; ++i) {
        const selectedOption: CategoryOption = selectedOptions[i];
        const option: CategoryOption | undefined = options.find((option: CategoryOption) => option.id === selectedOption.id);
        if (!option) {
          continue;
        }
        if (selectedOption.isMaterial && option.isMaterial) {
          const selectedMaterialItems: (CategoryMaterialItem | undefined)[] = (selectedOption as CategoryOption<true>).suboptions;
          const materialItems: (CategoryMaterialItem | undefined)[] = (option as CategoryOption<true>).suboptions;
          for (let j: number = 0; j < selectedMaterialItems.length; ++j) {
            const materialItem: CategoryMaterialItem | undefined = materialItems[j];
            const selectedMaterialItem: CategoryMaterialItem | undefined = selectedMaterialItems[j];
            if (selectedMaterialItem && selectedMaterialItem.suboptions.length > 0 && materialItem && !materialItem.isVisible) {
              materialItem.isVisible = true;
              hasChanged = true;
            }
          }
        }
      }
      if (hasChanged) {
        state.options = [...state.options];
      }
    },
    showMaterialItem1By1: (state: CategoriesState, action: PayloadAction<number>) => {
      const optionId: number = action.payload;
      const option: CategoryOption | undefined = state.options.find((option: CategoryOption) => option.id === optionId);
      if (option && option.isMaterial) {
        const suboptions: (CategoryMaterialItem | undefined)[] = (option as CategoryOption<true>).suboptions;
        for (let i: number = 0; i < suboptions.length; ++i) {
          const suboption: CategoryMaterialItem | undefined = suboptions[i];
          if (suboption && !suboption.isVisible) {
            suboption.isVisible = true;
            state.options = [...state.options];
            break;
          }
        }
      }
    },
    hideMaterialItem: (state: CategoriesState, action: PayloadAction<{optionId: number, suboptionId: number}>) => {
      const {optionId, suboptionId} = action.payload;
      const option: CategoryOption | undefined = state.options.find((option: CategoryOption) => option.id === optionId);
      if (option && option.isMaterial) {
        const materialItem: CategoryMaterialItem | undefined = (option as CategoryOption<true>).suboptions.find((suboption: CategoryMaterialItem | undefined) => suboption?.id === suboptionId);
        if (materialItem) {
          materialItem.isVisible = false;
          state.options = [...state.options];
        }
      }
    }
  },
  extraReducers: (builder: ActionReducerMapBuilder<CategoriesState>) => {
    [fetchAllProductSubcategories, fetchAllPrintingTypes, fetchCategoryOptions].forEach((asyncThunk) => {
      builder.addCase(asyncThunk.pending, (state: CategoriesState) => {
        state.loading = true;
      });
      builder.addCase(asyncThunk.rejected, (state: CategoriesState, action: PayloadAction<unknown, string, unknown, SerializedError>) => {
        console.error("categories slice error: ", action.error);
        state.loading = false;
      });
    });
    builder.addCase(fetchAllProductSubcategories.fulfilled, (state: CategoriesState, action: PayloadAction<ProductSubcategory[]>) => {
      state.productSubcategories = action.payload;
      state.loading = false;
    });
    builder.addCase(fetchAllPrintingTypes.fulfilled, (state: CategoriesState, action: PayloadAction<PrintingType[]>) => {
      state.printingTypes = action.payload;
      state.loading = false;
    });
    builder.addCase(fetchCategoryOptions.fulfilled, (state: CategoriesState, action: PayloadAction<CategoryOptionFromService[]>) => {
      state.options = action.payload.map((option: CategoryOptionFromService<boolean>): CategoryOption<boolean> => {
        if (option.isMaterial) {
          return {
            ...option,
            suboptions: (option as CategoryOptionFromService<true>).suboptions.map((suboptions: CategoryMaterialSuboption[] | null, index: number): CategoryMaterialItem => {
              if (!suboptions) {
                return {
                  id: index,
                  isVisible: false,
                  suboptions: []
                };
              }
              return {
                id: index,
                isVisible: suboptions.length > 0 && index === 0,
                suboptions: suboptions
              };
            })
          };
        }
        return { ...(option as CategoryOptionFromService<false>) };
      });

      state.loading = false;
    });
  }
});

export const {
  showMaterialItemsBySelectedOptions,
  showMaterialItem1By1,
  hideMaterialItem
} = categoriesSlice.actions;

export default categoriesSlice.reducer;