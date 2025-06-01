import { useRequest } from "@/hooks/useRequest";
import { ActionReducerMapBuilder, createAsyncThunk, createSlice, PayloadAction, SerializedError } from "@reduxjs/toolkit";

const { get, post } = useRequest();

interface Category{
  id: number;
  name: string;
  createdAt: Date;
};

export interface ProductSubcategory extends Category {}

export interface PrintingType extends Category {}

export interface CategoryMaterialSuboption {
  id: number;
  shown: boolean;
  suboptions: CategorySuboption[];
}

export interface CategoryOption<T extends boolean = boolean> extends Category {
  isMaterial: T;
  suboptions: T extends true ? (CategoryMaterialSuboption | undefined)[] : CategorySuboption[];
}

interface CategoryOptionFromService<T extends boolean = boolean> extends Category {
  isMaterial: T;
  suboptions: T extends true ? CategorySuboption[][] : CategorySuboption[];
}

export interface CategorySuboption extends Category {}

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
    showMaterialSuboption1By1: (state: CategoriesState, action: PayloadAction<number>) => {
      const optionId: number = action.payload;
      const option: CategoryOption | undefined = state.options.find((option: CategoryOption) => option.id === optionId);
      if (option && option.isMaterial) {
        const suboptions: (CategoryMaterialSuboption | undefined)[] = (option as CategoryOption<true>).suboptions;
        for (let i: number = 0; i < suboptions.length; ++i) {
          const suboption: CategoryMaterialSuboption | undefined = suboptions[i];
          if (suboption && !suboption.shown) {
            suboption.shown = true;
            state.options = [...state.options];
            break;
          }
        }
      }
    },
    hideMaterialSuboption: (state: CategoriesState, action: PayloadAction<{optionId: number, suboptionId: number}>) => {
      const {optionId, suboptionId} = action.payload;
      const option: CategoryOption | undefined = state.options.find((option: CategoryOption) => option.id === optionId);
      if (option && option.isMaterial) {
        const materialSuboption: CategoryMaterialSuboption | undefined = (option as CategoryOption<true>).suboptions.find((suboption: CategoryMaterialSuboption | undefined) => suboption?.id === suboptionId);
        if (materialSuboption) {
          materialSuboption.shown = false;
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
            suboptions: (option as CategoryOptionFromService<true>).suboptions.map((suboptions: CategorySuboption[], index: number): CategoryMaterialSuboption => {
              return {
                id: index,
                shown: suboptions.length > 0 && index === 0,
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
  showMaterialSuboption1By1,
  hideMaterialSuboption
} = categoriesSlice.actions;

export default categoriesSlice.reducer;