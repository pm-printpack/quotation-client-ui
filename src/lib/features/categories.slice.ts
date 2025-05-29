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

export interface CategoryOption extends Category {
  numOfDuplicate: number;
  isDynamic: boolean;
  suboptions: CategorySuboption[];
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

export const fetchCategoryOptions = createAsyncThunk<CategoryOption[], FetchCategoryOptionParams>(
  "categories/fetchCategoryOptions",
  async (params: FetchCategoryOptionParams): Promise<CategoryOption[]> => {
    const {data, error} = await get<{}, CategoryOption[]>(`/categories/options/${params.categoryProductSubcategoryId}/${params.categoryPrintingTypeId}`);
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
    builder.addCase(fetchCategoryOptions.fulfilled, (state: CategoriesState, action: PayloadAction<CategoryOption[]>) => {
      state.options = action.payload;
      state.loading = false;
    });
  }
});

export const {} = categoriesSlice.actions;

export default categoriesSlice.reducer;