"use client";
import {
	fetchAllProductSubcategories,
	fetchCategoryOptions,
	CategoryOption,
	CategoryPrintingType,
	CategoryProductSubcategory,
	CategorySuboption,
	CategoryMaterialItem,
	hideMaterialItem,
	showMaterialItem1By1,
	Material,
  showMaterialItemsBySelectedOptions,
	fetchPrintingTypesByProductSubcategoryId
} from "@/lib/features/categories.slice";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { RootState } from "@/lib/store";
import {
	AccordionItem,
	AccordionItemBody,
	AccordionItemContent,
	AccordionItemIndicator,
	AccordionItemTrigger,
	AccordionRoot,
	Box,
	Button,
	Center,
	CheckboxGroup,
	ClipboardCopyText,
	ClipboardIndicator,
	ClipboardRoot,
	ClipboardTrigger,
	CloseButton,
	DataListItem,
	DataListItemLabel,
	DataListItemValue,
	DataListRoot,
	DrawerBackdrop,
	DrawerBody,
	DrawerContent,
	DrawerOpenChangeDetails,
	DrawerPositioner,
	DrawerRoot,
	DrawerTrigger,
	FieldErrorText,
	FieldLabel,
	FieldRoot,
	Flex,
	Heading,
	HStack,
	IconButton,
	InputGroup,
	Link,
	NumberInputControl,
	NumberInputInput,
	NumberInputRoot,
	Portal,
	RadioCardItem,
	RadioCardItemHiddenInput,
	RadioCardItemText,
	RadioCardRoot,
	Separator,
	SimpleGrid,
	Span,
	Stack,
	StackSeparator,
	TabsList,
	TabsRoot,
	TabsTrigger,
	Text,
	useBreakpointValue,
	VStack
} from "@chakra-ui/react";
import { Fragment, MouseEvent, Ref, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LuPanelRightOpen, LuPlus } from "react-icons/lu";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import styles from "./page.module.css";
import {
	BaseCaseValue,
	calculateTotalPriceByDigitalPrinting,
	calculateTotalPriceByGravurePrinting,
	calculateTotalPriceByOffsetPrinting,
	calculateShippingCost,
	ShippingCost,
	Size
} from "@/lib/features/calculation.slice";
import CalculationUtil from "./utils/CalculationUtil";
import { useDebouncedCallback } from "use-debounce";
import { fetchExchangeRate, fetchShippings } from "@/lib/features/environment.slice";
import { CheckboxCard } from "@/components/ui/checkbox-card";

type BaseCaseFormValues = BaseCaseValue;

type FormValues = Size & {
	cases: BaseCaseFormValues[];
};

const DEBOUNCED_WAIT_TIME: number = 250; // ms

export default function Home() {
	const isAuthenticated: boolean = useAppSelector(
		(state: RootState) => state.auth.isAuthenticated
	);

	if (!isAuthenticated) {
		return undefined;
	}

	const dispatch = useAppDispatch();
	const isMobile: boolean | undefined = useBreakpointValue({
		base: true,
		sm: false
	});
	const productSubcategories: CategoryProductSubcategory[] = useAppSelector(
		(state: RootState) => state.categories.productSubcategories
	);
	const printingTypes: CategoryPrintingType[] = useAppSelector(
		(state: RootState) => state.categories.printingTypes
	);
	const options: CategoryOption[] = useAppSelector(
		(state: RootState) => state.categories.options
	);
	const plateFees: number[] = useAppSelector(
		(state: RootState) => state.calculation.plateFees
	);
	const totalPrices: number[] = useAppSelector(
		(state: RootState) => state.calculation.totalPrices
	);
	const shippingCost: ShippingCost[] = useAppSelector(
		(state: RootState) => state.calculation.shippingCost
	);
	const exchangeRate: number | undefined = useAppSelector(
		(state: RootState) => state.env.exchangeRate?.rate
	);
	const [selectedProductSubcategoryId, setSelectedProductSubcategoryId] =
		useState<number>(productSubcategories[0]?.id);
	const [displayedPrintingTypes, setDisplayedPrintingTypes] = useState<
		CategoryPrintingType[]
	>([]);
	const [hasGusset, setHasGusset] = useState<boolean>(false);
	const [selectedPrintingTypeId, setSelectedPrintingTypeId] = useState<number>(
		printingTypes[0]?.id
	);
	const [selectedOptionRecords, setSelectedOptionRecords] = useState<
		Record<number, CategoryOption<boolean>>
	>([]);
	const [formValues, setFormValues] = useState<FormValues>();
	const [productSubcategoryMenuOpen, setProductSubcategoryMenuOpen] =
		useState<boolean>(false);
	const [suggestedSKUs, isSuggestedSKUs] = useState<boolean[]>([]);
  const [formattedSelectedOptions, setFormattedSelectedOptions] = useState<CategoryOption[]>([]);
	const {
		control,
		handleSubmit,
		formState: { errors },
		setError,
		getValues,
		setValue
	} = useForm<FormValues>({
		defaultValues: {
			cases: [
				{
					numOfStyles: 1,
					quantityPerStyle: 100,
					totalQuantity: 100
				}
			]
		}
	});
	const {
		fields: caseFields,
		append: appendCase,
		remove: removeCase
	} = useFieldArray({
		control,
		name: "cases"
	});
	const quotationResultRef: Ref<HTMLDivElement> = useRef(null);
	const [quotationTextResult, setQuotationTextResult] = useState<string>("");

	const selectedProductSubcategory: CategoryProductSubcategory | undefined = useMemo(() => productSubcategories.find(({ id }) => id === selectedProductSubcategoryId), [productSubcategories, selectedProductSubcategoryId]);
	const selectedPrintingType: CategoryPrintingType | undefined = useMemo(() => printingTypes.find((printingType: CategoryPrintingType) => printingType.id === selectedPrintingTypeId), [printingTypes, selectedPrintingTypeId]);

	useEffect(() => {
		dispatch(fetchExchangeRate());
		dispatch(fetchShippings());
		dispatch(fetchAllProductSubcategories());
	}, [dispatch]);

	useEffect(() => {
		if (productSubcategories.length > 0) {
			if (selectedProductSubcategoryId) {
				dispatch(fetchPrintingTypesByProductSubcategoryId(selectedProductSubcategoryId));
				setHasGusset(
					productSubcategories.find(
						(productSubcategory: CategoryProductSubcategory | undefined) =>
							productSubcategory?.id === selectedProductSubcategoryId
					)?.hasGusset || false
				);
			} else {
				setSelectedProductSubcategoryId(productSubcategories[0].id);
			}
		}
	}, [productSubcategories, selectedProductSubcategoryId]);

	useEffect(() => {
		if (!selectedPrintingTypeId && printingTypes.length > 0) {
			setSelectedPrintingTypeId(printingTypes[0].id);
		}
	}, [printingTypes, selectedPrintingTypeId]);

	useEffect(() => {
		if (selectedProductSubcategory?.name.toLowerCase() === "film") {
			setDisplayedPrintingTypes(
				printingTypes.filter(
					({ name }) => name.toLowerCase() !== "offset printing"
				)
			);
			setSelectedPrintingTypeId(printingTypes[0].id);
			return;
		}
		setDisplayedPrintingTypes(printingTypes);
	}, [selectedProductSubcategory, printingTypes]);

	useEffect(() => {
		if (selectedProductSubcategoryId && selectedPrintingTypeId) {
			(async () => {
				await dispatch(
					fetchCategoryOptions({
						categoryProductSubcategoryId: selectedProductSubcategoryId,
						categoryPrintingTypeId: selectedPrintingTypeId
					})
				).unwrap();
				handleSubmit(onSubmit)();
			})();
		}
	}, [selectedProductSubcategoryId, selectedPrintingTypeId]);

	const filterAndFormatSelectedOptionRecords = useCallback((): CategoryOption<boolean>[] => {
		const selectedOptions: (CategoryOption<boolean> | undefined)[] = JSON.parse(JSON.stringify(Object.values(selectedOptionRecords)));
		for (let i: number = 0; i < selectedOptions.length; ++i) {
			const selectedOption: CategoryOption | undefined = selectedOptions[i];
			if (!selectedOption) {
				continue;
			}
			const optionIndex: number = options.findIndex(({ id }: CategoryOption) => id === selectedOption.id);
			if (optionIndex > -1) {
				const option: CategoryOption = options[optionIndex];
				if (selectedOption.isMaterial) {
					const selectedMaterialItems: (CategoryMaterialItem | undefined)[] = (selectedOption as CategoryOption<true>).suboptions;
					const materialItems: (CategoryMaterialItem | undefined)[] = (option as CategoryOption<true>).suboptions;
					for (let j: number = 0; j < selectedMaterialItems.length; ++j) { // layers
						const selectedMaterialItem: CategoryMaterialItem | undefined = selectedMaterialItems[j];
						const materialItem: CategoryMaterialItem | undefined = materialItems[j];
						if (materialItem) {
							if (selectedMaterialItem) {
								const selectedMaterials: Material[] = selectedMaterialItem.suboptions;
								for (let n: number = 0; n < selectedMaterials.length; ++n) {
									if (
										!materialItem.suboptions.some(
											({ id }) => id === selectedMaterials[n].id
										)
									) {
										selectedMaterials.splice(n, 1);
										--n;
									}
								}
							}
						} else {
							(selectedOption as CategoryOption<true>).suboptions[j] = undefined;
						}
					}
				} else {
					const selectedSuboptions: CategorySuboption[] = (selectedOption as CategoryOption<false>).suboptions;
					for (let j: number = 0; j < selectedSuboptions.length; ++j) {
						if ((option as CategoryOption<false>).suboptions.some(({ id }) => selectedSuboptions[j].id === id)) {
							continue;
						}
						selectedSuboptions.splice(j, 1);
						--j;
					}
				}
			} else {
				selectedOptions[i] = undefined;
			}
		}
		console.log("selectedOptions: ", selectedOptions);
		return selectedOptions.filter((option: CategoryOption<boolean> | undefined) => !!option);
	}, [selectedOptionRecords, options]);

	const isFormValuesValidate = useCallback((formValues?: FormValues): boolean => {
		// To check size area
		if (printingTypes.find(({id}) => id === selectedPrintingTypeId)?.name?.toLowerCase() === "digital printing") {
			let hasError: boolean = false;
			if (formValues?.width && formValues?.width > 600) {
				setError("width", {
					type: "manual",
					message: "Width cannot be greater than 600"
				}, { shouldFocus: !hasError });
				hasError = true;
			}
			if (formValues?.height && formValues?.height > 370) {
				setError("height", {
					type: "manual",
					message: "Height cannot be greater than 370"
				}, { shouldFocus: !hasError });
				hasError = true;
			}
			if (hasError) {
				return false;
			}
		}
		if (!(formValues?.width && formValues?.height && (!hasGusset || formValues?.gusset))) {
			return false;
		}

		// To check numbers area
		if (!(
			formValues?.cases?.length &&
			formValues?.cases
				.map<boolean>(({numOfStyles, quantityPerStyle}) => !!(numOfStyles && quantityPerStyle))
				.reduce((a: boolean, b: boolean) => a && b)
		)) {
			return false;
		}
		return true;
	}, [hasGusset]);

	const isSelectedOptionsValidate = useCallback((selectedOptions: CategoryOption<boolean>[]) => {
		const requiredOprions: CategoryOption[] = options.filter(({isRequired}) => isRequired);
		for (let i: number = 0; i < requiredOprions.length; ++i) {
			const option: CategoryOption = requiredOprions[i];
			if (option.isMaterial) {
				let hasSuboptions: boolean = false;
				const materialItems: (CategoryMaterialItem | undefined)[] = (option as CategoryOption<true>).suboptions;
				for (let j: number = 0; j < materialItems.length; ++j) {
					const materialItem: CategoryMaterialItem | undefined = materialItems[j];
					hasSuboptions = !!(materialItem && materialItem.suboptions.length > 0);
				}
				if (hasSuboptions) {
					const selectedMaterialOption: CategoryOption<true> | undefined = selectedOptions.find(({id}) => option.id === id) as (CategoryOption<true> | undefined);
					if (!selectedMaterialOption?.suboptions?.length) {
						return false;
					}
					const selectedMaterialAllSuboptions = [];
					for (const materialItem of selectedMaterialOption.suboptions) {
						if (materialItem) {
							for (const materialSuboption of materialItem.suboptions) {
								if (materialSuboption) {
									selectedMaterialAllSuboptions.push(materialSuboption);
								}
							}
						}
					}
					if (selectedMaterialAllSuboptions.length === 0) {
						return false;
					}
				}
			} else {
				if ((option as CategoryOption<false>).suboptions.length > 0 && !selectedOptions.find(({id}) => option.id === id)?.suboptions?.length) {
					return false;
				}
			}
		}
		return true;
	}, [options]);

	const onSubmit = useCallback(useDebouncedCallback(
		(values: FormValues) => {
			isSuggestedSKUs([]);
			if (!isFormValuesValidate(values)) {
				return;
			}
			const formattedSelectedOptions: CategoryOption<boolean>[] = filterAndFormatSelectedOptionRecords();
			setFormattedSelectedOptions(formattedSelectedOptions);
			console.log("formattedSelectedOptions: ", formattedSelectedOptions);
			if (!isSelectedOptionsValidate(formattedSelectedOptions)) {
				return;
			}
			setFormValues(undefined);
			console.log(values);
			if (values) {
				if (!values.width || !values.height) {
					return;
				}
				if (!selectedPrintingType) {
					return;
				}
        dispatch(showMaterialItemsBySelectedOptions(formattedSelectedOptions));
				if (selectedPrintingType.name.toLowerCase() === "digital printing") {
					dispatch(
						calculateTotalPriceByDigitalPrinting({
							categoryProductSubcategoryId: selectedProductSubcategoryId,
        			categoryPrintingTypeId: selectedPrintingTypeId,
							width: values.width,
							height: values.height,
							gusset: hasGusset ? values.gusset : undefined,
							cases: values.cases,
							options: formattedSelectedOptions
						})
					);
				} else if (
					selectedPrintingType.name.toLowerCase() === "offset printing"
				) {
					const suggests: boolean[] = [];
					for (let i: number = 0; i < values.cases.length; ++i) {
						const baseCase: BaseCaseValue = values.cases[i];
						const { numOfMatchedModulus, matchedPerimeter } =
						CalculationUtil.calculateNumOfMatchedModulus(
							values.width,
							values.height,
							baseCase.numOfStyles,
							formattedSelectedOptions
						);
						baseCase.numOfMatchedModulus = numOfMatchedModulus;
						baseCase.matchedPerimeter = matchedPerimeter;
						if (baseCase.numOfStyles !== 1 && numOfMatchedModulus !== 1) {
							suggests.push(
								Math.round((baseCase.numOfStyles || 0) / numOfMatchedModulus) * numOfMatchedModulus !== (baseCase.numOfStyles || 0)
							);
						}
					}
					isSuggestedSKUs(suggests);
					dispatch(
						calculateTotalPriceByOffsetPrinting({
							categoryProductSubcategoryId: selectedProductSubcategoryId,
        			categoryPrintingTypeId: selectedPrintingTypeId,
							width: values.width,
							height: values.height,
							gusset: hasGusset ? values.gusset : undefined,
							cases: values.cases,
							options: formattedSelectedOptions
						})
					);
				} else if (
					selectedPrintingType.name.toLowerCase() === "gravure printing"
				) {
					dispatch(
						calculateTotalPriceByGravurePrinting({
							categoryProductSubcategoryId: selectedProductSubcategoryId,
        			categoryPrintingTypeId: selectedPrintingTypeId,
							width: values.width,
							height: values.height,
							gusset: hasGusset ? values.gusset : undefined,
							cases: values.cases,
							options: formattedSelectedOptions
						})
					);
				}
				dispatch(
					calculateShippingCost({
						categoryProductSubcategoryId: selectedProductSubcategoryId,
						categoryPrintingTypeId: selectedPrintingTypeId,
						width: values.width,
						height: values.height,
						cases: values.cases,
						options: formattedSelectedOptions
					})
				);
			}
			setFormValues(values);
		}, DEBOUNCED_WAIT_TIME),
		[
			hasGusset,
			selectedProductSubcategoryId,
			selectedPrintingType,
			selectedPrintingTypeId,
			filterAndFormatSelectedOptionRecords,
			isFormValuesValidate,
			isSelectedOptionsValidate
		]
	);

	useEffect(() => {
		setQuotationTextResult(quotationResultRef.current?.innerText || "");
	}, [formValues, selectedOptionRecords]);

	const onAddNewBaseCase = useCallback(() => {
		appendCase({
			numOfStyles: NaN,
			quantityPerStyle: NaN,
			totalQuantity: 0
		});
		handleSubmit(onSubmit)();
	}, [appendCase, onSubmit]);

	const onDeleteBaseCase = useCallback(
		(index: number) => {
			return () => {
				removeCase(index);
				handleSubmit(onSubmit)();
			};
		},
		[removeCase, onSubmit]
	);

	const onAddMaterialCategorySuboption = useCallback(
		(option: CategoryOption<true>) => {
			return () => {
				dispatch(showMaterialItem1By1(option.id));
			};
		},
		[]
	);

	const onDeleteMaterialCategorySuboption = useCallback(
		(option: CategoryOption<true>, materialItemId: number) => {
			return () => {
				dispatch(
					hideMaterialItem({
						optionId: option.id,
						suboptionId: materialItemId
					})
				);
				if (selectedOptionRecords[option.id]) {
					const materialItemIndex: number = (
						selectedOptionRecords[option.id] as CategoryOption<true>
					).suboptions.findIndex(
						(materialItem: CategoryMaterialItem | undefined) =>
							materialItem?.id === materialItemId
					);
					if (materialItemIndex > -1) {
						(
							selectedOptionRecords[option.id] as CategoryOption<true>
						).suboptions[materialItemIndex] = undefined;
						setSelectedOptionRecords({ ...selectedOptionRecords });
						handleSubmit(onSubmit)();
					}
				}
			};
		},
		[selectedOptionRecords, onSubmit]
	);

	const getSelectedValueOfMaterialItem = useCallback(
		(option: CategoryOption<true>, materialItemId: number): string | null => {
			const selectedOption: CategoryOption | undefined =
				selectedOptionRecords[option.id];
			if (selectedOption) {
				const selectedMaterialOption: CategoryOption<true> =
					selectedOption as CategoryOption<true>;
				const selectedMaterialItem: CategoryMaterialItem | undefined =
					selectedMaterialOption.suboptions.find(
						(materialItem: CategoryMaterialItem | undefined) =>
							materialItem?.id === materialItemId
					);
				if (
					selectedMaterialItem &&
					selectedMaterialItem.suboptions?.length > 0
				) {
					return `${selectedMaterialItem.suboptions[0].id}`;
				}
			}
			return null;
		},
		[selectedOptionRecords]
	);

	const setSelectedValueOfMaterialItem = useCallback(
		(option: CategoryOption<true>, materialItemId: number) => {
			return ({ value: selectedSuboptionId }: { value: string | null }) => {
				const selectedOption: CategoryOption | undefined =
					selectedOptionRecords[option.id];
				if (!selectedOption) {
					selectedOptionRecords[option.id] = {
						...option,
						suboptions: []
					};
				}
				const materialItemIndex: number = option.suboptions.findIndex(
					(materialItem: CategoryMaterialItem | undefined) =>
						materialItem?.id === materialItemId
				);
				if (materialItemIndex > -1) {
					const materialItem: CategoryMaterialItem | undefined =
						option.suboptions.find(
							(materialItem: CategoryMaterialItem | undefined) =>
								materialItem?.id === materialItemId
						);
					if (
						!selectedOptionRecords[option.id].suboptions[materialItemIndex] &&
						materialItem
					) {
						selectedOptionRecords[option.id].suboptions[materialItemIndex] = {
							...materialItem,
							suboptions: []
						};
					}
					if (materialItem && materialItem.isVisible) {
						const selectedMaterial: Material | undefined = materialItem.suboptions.find(
							(suboption: CategorySuboption) => suboption.id === Number(selectedSuboptionId)
						);
						if (selectedMaterial) {
							const selectedMaterialItem: CategoryMaterialItem | undefined = (
								selectedOptionRecords[option.id] as CategoryOption<true>
							).suboptions[materialItemIndex];
							if (selectedMaterialItem) {
								selectedMaterialItem.suboptions[0] = selectedMaterial;
							}
						} else {
							selectedOptionRecords[option.id].suboptions[materialItemIndex] =
								undefined;
						}
						setSelectedOptionRecords({ ...selectedOptionRecords });
					}
				}
				if (!isMobile) {
					handleSubmit(onSubmit)();
				}
			};
		},
		[selectedOptionRecords, handleSubmit, onSubmit, isMobile]
	);

	const getSelectedValueOfNonMaterialItem = useCallback((option: CategoryOption<false>): string[] => {
		const selectedOption: CategoryOption | undefined = selectedOptionRecords[option.id];
		const selectedIds: string[] = [];
		if (selectedOption) {
			for (const suboption of (selectedOption as CategoryOption<false>).suboptions) {
				if (suboption && suboption.id) {
					selectedIds.push(`${ suboption.id }`);
				}
			}
		}
		return selectedIds;
	}, [selectedOptionRecords]);

	const setSelectedValueOfNonMaterialItem = useCallback((option: CategoryOption<false>) => {
		return ({ value: selectedSuboptionId }: { value: string | null }) => {
			let selectedOption: CategoryOption | undefined = selectedOptionRecords[option.id];
			if (!selectedOption) {
				selectedOptionRecords[option.id] = {
					...option,
					suboptions: []
				};
			}
			if (selectedSuboptionId) {
				selectedOptionRecords[option.id].suboptions = option.suboptions.filter(
						(suboption: CategorySuboption) => suboption.id === Number(selectedSuboptionId)
				);
				setSelectedOptionRecords({ ...selectedOptionRecords });
			}
			if (!isMobile) {
				handleSubmit(onSubmit)();
			}
		};
	}, [selectedOptionRecords, handleSubmit, onSubmit, isMobile]);

	const setSelectedMultipleValueOfNonMaterialItem = useCallback((option: CategoryOption<false>) => {
		return (valselectedSuboptionIds: string[] ) => {
			let selectedOption: CategoryOption | undefined = selectedOptionRecords[option.id];
			if (!selectedOption) {
				selectedOptionRecords[option.id] = {
					...option,
					suboptions: []
				};
			}
			if (valselectedSuboptionIds && valselectedSuboptionIds.length > 0) {
				const suboptions: CategorySuboption[] = [];
				for (const selectedSuboptionId of valselectedSuboptionIds) {
					const suboption: CategorySuboption | undefined = option.suboptions.find(({id}) => `${id}` === selectedSuboptionId);
					if (suboption) {
						suboptions.push(suboption);
					}
				}
				selectedOptionRecords[option.id].suboptions = suboptions;
			} else {
				delete selectedOptionRecords[option.id];
			}
			setSelectedOptionRecords({ ...selectedOptionRecords });
			if (!isMobile) {
				handleSubmit(onSubmit)();
			}
		};
	}, [selectedOptionRecords, handleSubmit, onSubmit, isMobile]);

	const onSelectedProductSubcategoryChange = useCallback(({ value }: { value: string }) => {
		setSelectedProductSubcategoryId(Number(value));
	}, []);

	const onSelectedPrintingTypeChange = useCallback(({ value }: { value: string }) => {
		setSelectedPrintingTypeId(Number(value));
	}, []);

	useEffect(() => {
		if (selectedPrintingType && selectedPrintingType.name.toLowerCase() === "gravure printing") {
			caseFields.forEach((field: BaseCaseFormValues, index: number) => {
				setValue(`cases.${index}.numOfStyles`, 1);
			});
		}
	}, [selectedPrintingType, caseFields]);

	const clearSelectedMaterialSuboption = useCallback(
		(
			option: CategoryOption<true>,
			selectedMaterialItem: CategoryMaterialItem
		) => {
			const selectedOption: CategoryOption<true> | undefined =
				selectedOptionRecords[option.id] as CategoryOption<true> | undefined;
			if (selectedOption) {
				const selectedMaterialItems: (CategoryMaterialItem | undefined)[] =
					selectedOption.suboptions;
				if (selectedMaterialItems) {
					const materialItemIndex: number = selectedMaterialItems.findIndex(
						(materialItem: CategoryMaterialItem | undefined) =>
							materialItem?.id === selectedMaterialItem.id
					);
					if (materialItemIndex > -1) {
						selectedMaterialItems[materialItemIndex] = undefined;
						setSelectedOptionRecords({ ...selectedOptionRecords });
						handleSubmit(onSubmit)();
					}
				}
			}
		},
		[onSubmit, selectedOptionRecords]
	);

	const clearSelectedNonMaterialSuboption = useCallback(
		(option: CategoryOption<false>) => {
			if (selectedOptionRecords[option.id]) {
				delete selectedOptionRecords[option.id];
				setSelectedOptionRecords({ ...selectedOptionRecords });
				handleSubmit(onSubmit)();
			}
		},
		[onSubmit, selectedOptionRecords]
	);

	const onUnselectedMaterialItem = useCallback(
		(
			option: CategoryOption<true>,
			materialItem: CategoryMaterialItem,
			suboption: CategorySuboption
		) => {
			return (event: MouseEvent<HTMLDivElement>) => {
				if (
					getSelectedValueOfMaterialItem(option, materialItem.id) ===
					`${suboption.id}`
				) {
					event.stopPropagation();
					event.preventDefault();
					clearSelectedMaterialSuboption(option, materialItem);
				}
			};
		},
		[getSelectedValueOfMaterialItem, clearSelectedMaterialSuboption]
	);

	const onUnselectedNonMaterialItem = useCallback(
		(option: CategoryOption<false>, suboption: CategorySuboption) => {
			return (event: MouseEvent<HTMLDivElement>) => {
				if (getSelectedValueOfNonMaterialItem(option)[0] === `${suboption.id}`) {
					event.stopPropagation();
					event.preventDefault();
					clearSelectedNonMaterialSuboption(option);
				}
			};
		},
		[getSelectedValueOfNonMaterialItem, clearSelectedNonMaterialSuboption]
	);

	const hasBeenSelectedOnMaterialSuboption = useCallback((optionId: number, materialItemId: number, suboptionId: number): boolean => {
		for (const selectedOption of Object.values(selectedOptionRecords)) {
			if (selectedOption.isMaterial) {
				const materialItems: (CategoryMaterialItem | undefined)[] = (selectedOption as CategoryOption<true>).suboptions;
				for (const materialItem of materialItems) {
					if (materialItem && materialItem.suboptions.length > 0) {
						if (materialItem.suboptions.some((suboption: Material) => suboption?.id === suboptionId)) {
							if (selectedOption.id === optionId && materialItem.id === materialItemId) {
								return false;
							}
							return true;
						}
					}
				}
			}
		}
		return false;
	}, [selectedOptionRecords]);

	const renderMaterialItemArea = useCallback(
		(option: CategoryOption<true>, index: number) => {
			return (
				<VStack
					w="full"
					align="flex-start"
					{...(option.suboptions.length > 1
						? { bg: "bg.muted", p: "0.75rem", borderRadius: "0.25rem" }
						: {})}
				>
					{option.suboptions.map(
						(
							materialItem: CategoryMaterialItem | undefined,
							suboptionIndex: number
						) => {
							if (!materialItem || !materialItem.isVisible) {
								return undefined;
							}
							return (
								<Flex
									key={`materialItem-${materialItem.id}`}
									w="full"
									direction={{ base: "column", md: "row" }}
									gap="4"
									align="flex-start"
									{...(option.suboptions.length > 1
										? {
												padding: "0.75rem",
												borderRadius: "0.25rem",
												position: "relative",
												bg: "bg.emphasized",
												css: { "--field-label-width": "8.625rem" },
												"data-state": "open",
												_open: {
													animationName: "fade-in, scale-in",
													animationDuration: "300ms"
												},
												_closed: {
													animationName: "fade-out, scale-out",
													animationDuration: "120ms"
												}
										  }
										: {})}
								>
									{option.suboptions.length > 1 ? (
										<Text textAlign="right">{`${option.name} ${
											suboptionIndex + 1
										}:`}</Text>
									) : null}
									<RadioCardRoot
										orientation="vertical"
										align="center"
										w="full"
										variant="outline"
										value={getSelectedValueOfMaterialItem(
											option,
											materialItem.id
										)}
										onValueChange={setSelectedValueOfMaterialItem(
											option,
											materialItem.id
										)}
									>
										<SimpleGrid
											w="full"
											gap={4}
											templateColumns="repeat(auto-fit, minmax(10rem, 10rem))"
										>
											{materialItem.suboptions.map(
												(suboption: CategorySuboption) => (
													<RadioCardItem
														key={`suboption-${suboption.id}`}
														value={`${suboption.id}`}
														className={styles.radioCardItem}
														disabled={hasBeenSelectedOnMaterialSuboption(option.id, materialItem.id, suboption.id)}
														onClick={onUnselectedMaterialItem(
															option,
															materialItem,
															suboption
														)}
													>
														<RadioCardItemHiddenInput />
														<RadioCardItemText>
															<Center p="2" fontSize="sm">
																{suboption.name}
															</Center>
														</RadioCardItemText>
													</RadioCardItem>
												)
											)}
										</SimpleGrid>
									</RadioCardRoot>
									{option.suboptions.filter(
										(materialItem: CategoryMaterialItem | undefined) =>
											materialItem?.isVisible
									).length > 1 ? (
										<CloseButton
											size="sm"
											position="absolute"
											top="0"
											right="0"
											onClick={onDeleteMaterialCategorySuboption(
												option,
												materialItem.id
											)}
										/>
									) : null}
								</Flex>
							);
						}
					)}
					{option.suboptions.length > 1 &&
					option.suboptions.filter(
						(suboption: CategoryMaterialItem | undefined) => suboption?.isVisible
					).length < option.suboptions.length ? (
						<Button
							variant="subtle"
							w="full"
							onClick={onAddMaterialCategorySuboption(option)}
						>
							<LuPlus />
						</Button>
					) : null}
				</VStack>
			);
		},
		[
			setSelectedValueOfMaterialItem,
			getSelectedValueOfMaterialItem,
			onDeleteMaterialCategorySuboption,
			onAddMaterialCategorySuboption,
			onUnselectedMaterialItem,
			hasBeenSelectedOnMaterialSuboption
		]
	);

	const disableProductionProcessItem = useCallback((suboptionName: string): boolean => {
		if (!selectedProductSubcategory || !selectedPrintingType) {
			return false;
		}
		const selectedProductionProcessOption: CategoryOption<false> | undefined = Object.values(selectedOptionRecords).find(({name}) => name.toLowerCase() === "production process") as (CategoryOption<false> | undefined);
		if (selectedProductionProcessOption) {
			const selectedSuboptions: CategorySuboption[] = selectedProductionProcessOption.suboptions;
			for (const selectedSuboption of selectedSuboptions) {
				if (
					["3 side seal bag", "stand-up bag", "4 side seal bag", "flat bottoom bag"].includes(selectedProductSubcategory.name.toLowerCase())
					&& ["digital printing", "offset printing", "gravure printing"].includes(selectedPrintingType.name.toLowerCase())
					&& ["round hole", "hang hole", "handle hole"].includes(selectedSuboption.name.toLowerCase())
				) {
					if (["round hole", "hang hole", "handle hole"].filter((name: string) => name !== selectedSuboption.name.toLowerCase()).includes(suboptionName.toLowerCase())) {
						return true;
					}
				} else if (
					"stand-up bag" === selectedProductSubcategory.name.toLowerCase()
					&& "offset printing" === selectedPrintingType.name.toLowerCase()
					&& ["transparent bottom", "bottom color", "bottom design"].includes(selectedSuboption.name.toLowerCase())
				) {
					if (["transparent bottom", "bottom color", "bottom design"].filter((name: string) => name !== selectedSuboption.name.toLowerCase()).includes(suboptionName.toLowerCase())) {
						return true;
					}
				}
			}
		}
		return false;
	}, [selectedOptionRecords, selectedProductSubcategory, selectedPrintingType]);

	const renderNonMaterialItemArea = useCallback(
		(option: CategoryOption<false>, index: number) => {
			if (option.name.toLowerCase() === "production process") {
				return (
					<CheckboxGroup w="full" onValueChange={setSelectedMultipleValueOfNonMaterialItem(option)}>
						<SimpleGrid
							gap={{ md: 4, base: 2 }}
							templateColumns="repeat(auto-fit, minmax(10rem, 10rem))"
						>
							{
								option.suboptions.map((suboption: CategorySuboption) => (
									<CheckboxCard
										key={`suboption-${suboption.id}`}
										indicator={null}
										htmlFor={`suboption-${suboption.id}`}
										value={`${ suboption.id }`}
										className={styles.radioCardItem}
										label={
											<Center w="full" p="2" fontSize="sm">
												{suboption.name}
											</Center>
										}
										disabled={disableProductionProcessItem(suboption.name)}
									/>
								))
							}
						</SimpleGrid>
					</CheckboxGroup>
				);
			} else {
				return (
					<RadioCardRoot
						orientation="vertical"
						align="center"
						w="full"
						variant="outline"
						key={`category-option-${option.id}`}
						value={getSelectedValueOfNonMaterialItem(option)[0] || null}
						onValueChange={setSelectedValueOfNonMaterialItem(option)}
					>
						<SimpleGrid
							w="full"
							gap={{ md: 4, base: 2 }}
							templateColumns="repeat(auto-fit, minmax(10rem, 10rem))"
						>
							{option.suboptions.map((suboption: CategorySuboption) => (
								<RadioCardItem
									key={`suboption-${suboption.id}`}
									value={`${suboption.id}`}
									className={styles.radioCardItem}
									onClick={onUnselectedNonMaterialItem(option, suboption)}
								>
									<RadioCardItemHiddenInput />
									<RadioCardItemText>
										<Center p="2" fontSize="sm">
											{suboption.name}
										</Center>
									</RadioCardItemText>
								</RadioCardItem>
							))}
						</SimpleGrid>
					</RadioCardRoot>
				);
			}
		},
		[
			setSelectedValueOfNonMaterialItem,
			setSelectedMultipleValueOfNonMaterialItem,
			getSelectedValueOfNonMaterialItem,
			onUnselectedNonMaterialItem
		]
	);

	const onCategoryProductSubcategoryMenuItemClick = useCallback(
		(categoryProductSubcategoryId: number) => {
			return () => {
				setSelectedProductSubcategoryId(categoryProductSubcategoryId);
				setProductSubcategoryMenuOpen(false);
			};
		},
		[]
	);

	const renderQutationDetailPanel = useCallback(
		(caseItem: BaseCaseFormValues, index: number) => {
			return (
				<DataListRoot orientation="horizontal" w="full">
					<DataListItem>
						<DataListItemLabel>Number of Styles</DataListItemLabel>
						<DataListItemValue justifyContent="flex-end">
							{caseItem.numOfStyles}
						</DataListItemValue>
					</DataListItem>
					<DataListItem>
						<DataListItemLabel>Quantity per Style</DataListItemLabel>
						<DataListItemValue justifyContent="flex-end">
							{caseItem.quantityPerStyle}
						</DataListItemValue>
					</DataListItem>
					<DataListItem>
						<DataListItemLabel>Total Quantity</DataListItemLabel>
						<DataListItemValue justifyContent="flex-end">
							{caseItem.totalQuantity}
						</DataListItemValue>
					</DataListItem>
					{
						(selectedPrintingType && selectedPrintingType.name.toLowerCase() === "gravure printing")
						?
						<DataListItem>
							<DataListItemLabel>Plate Fee</DataListItemLabel>
							<DataListItemValue justifyContent="flex-end">
								{plateFees[index]
									? exchangeRate
										? new Intl.NumberFormat("en-US", {
												style: "currency",
												currency: "USD"
											}).format(plateFees[index] / exchangeRate)
										: new Intl.NumberFormat("zh-CN", {
												style: "currency",
												currency: "CNY"
											}).format(plateFees[index])
									: "-"}
							</DataListItemValue>
						</DataListItem>
						:
						null
					}
					<DataListItem>
						<DataListItemLabel>
							Product Quotation{(selectedPrintingType && selectedPrintingType.name.toLowerCase() === "gravure printing") ? "(includes Plate Fee)" : ""}
						</DataListItemLabel>
						<DataListItemValue justifyContent="flex-end">
							{totalPrices[index]
								? exchangeRate
									? new Intl.NumberFormat("en-US", {
											style: "currency",
											currency: "USD"
									  }).format(totalPrices[index] / exchangeRate)
									: new Intl.NumberFormat("zh-CN", {
											style: "currency",
											currency: "CNY"
									  }).format(totalPrices[index])
								: "-"}
						</DataListItemValue>
					</DataListItem>
					<DataListItem>
						<DataListItemLabel>Estimated Weight</DataListItemLabel>
						<DataListItemValue justifyContent="flex-end">
							{shippingCost[index].totalWeight
								? new Intl.NumberFormat("en-US", {
										style: "unit",
										unit: "kilogram",
										unitDisplay: "short"
								  }).format(shippingCost[index].totalWeight)
								: "-"}
						</DataListItemValue>
					</DataListItem>
					{
						shippingCost[index].totalWeight > 500
						?
						<DataListItem alignItems="flex-start">
							<DataListItemLabel>Estimated Shipping cost</DataListItemLabel>
							<DataListItemValue justifyContent="flex-end">If you need to palletize, please contact the business for a separate quotation.</DataListItemValue>
						</DataListItem>
						:
						<>
							<DataListItem alignItems="flex-start">
								<DataListItemLabel>Estimated Sea freight cost</DataListItemLabel>
								<DataListItemValue justifyContent="flex-end">
									{
										exchangeRate
										?
										new Intl.NumberFormat("en-US", {style: "currency", currency: "USD"}).format((shippingCost[index].seaFreightCost + 500) / exchangeRate)
										:
										new Intl.NumberFormat("zh-CN", {style: "currency", currency: "CNY"}).format((shippingCost[index].seaFreightCost + 500))
									}
								</DataListItemValue>
							</DataListItem>
							<DataListItem alignItems="flex-start">
								<DataListItemLabel>Estimated Air freight cost</DataListItemLabel>
								<DataListItemValue justifyContent="flex-end">
									{
										exchangeRate
										?
										new Intl.NumberFormat("en-US", {style: "currency", currency: "USD"}).format((shippingCost[index].airFreightCost + 500) / exchangeRate)
										:
										new Intl.NumberFormat("zh-CN", {style: "currency", currency: "CNY"}).format((shippingCost[index].airFreightCost + 500))
									}
								</DataListItemValue>
							</DataListItem>
						</>
					}
				</DataListRoot>
			);
		},
		[formValues, selectedOptionRecords, shippingCost, totalPrices, exchangeRate]
	);

	const getWidthRules = useCallback(() => {
		const selectedPrintingTypes: CategoryPrintingType | undefined = printingTypes.find(({id}) => id === selectedPrintingTypeId);
		if (selectedPrintingTypes) {
			switch (selectedPrintingTypes.name.toLowerCase()) {
				case "digital printing":
					return {
						max: {
							value: 600,
							message: "Width cannot be greater than 600."
						}
					};
				case "offset printing":
					return {
						max: {
							value: 330,
							message: "The bag width exceed 330mm, please contact the sales for quote."
						}
					};
				case "gravure printing":
					return {
						max: {
							value: 500,
							message: "The bag width exceed 500mm, please contact the sales for quote."
						}
					};
			}
		}
		return {};
	}, [printingTypes, selectedPrintingTypeId]);

	const getHeightRules = useCallback(() => {
		const selectedPrintingTypes: CategoryPrintingType | undefined = printingTypes.find(({id}) => id === selectedPrintingTypeId);
		if (selectedPrintingTypes) {
			switch (selectedPrintingTypes.name.toLowerCase()) {
				case "digital printing":
					return {
						max: {
							value: 370,
							message: "Height cannot be greater than 370."
						}
					};
				case "offset printing":
					return {
						max: {
							value: 240,
							message: "The bag width exceed 240mm, please contact the sales for quote."
						}
					};
				case "gravure printing":
					return {
						max: {
							value: 500,
							message: "The bag width exceed 500mm, please contact the sales for quote."
						}
					};
			}
		}
		return {};
	}, [printingTypes, selectedPrintingTypeId]);

	return (
		<VStack w="full" h="full" p={{ base: "2", md: "4" }} align="flex-start">
			{isMobile ? (
				<HStack w="full" justifyContent="space-between">
					<TabsRoot value={`${selectedProductSubcategoryId}`} variant="subtle">
						<TabsList>
							{productSubcategories
								.filter(
									(productSubcategory: CategoryProductSubcategory) =>
										productSubcategory.id === selectedProductSubcategoryId
								)
								.map((productSubcategory: CategoryProductSubcategory) => (
									<TabsTrigger
										flexShrink={0}
										value={`${productSubcategory.id}`}
										key={`m-productSubcategory-${productSubcategory.id}`}
									>
										{productSubcategory.name}
									</TabsTrigger>
								))}
						</TabsList>
					</TabsRoot>
					<DrawerRoot
						open={productSubcategoryMenuOpen}
						onOpenChange={(e: DrawerOpenChangeDetails) =>
							setProductSubcategoryMenuOpen(e.open)
						}
					>
						<DrawerTrigger asChild>
							<IconButton
								variant="subtle"
								aria-label="Open Drawer"
								rounded="full"
							>
								<LuPanelRightOpen />
							</IconButton>
						</DrawerTrigger>
						<Portal>
							<DrawerBackdrop>
								<DrawerPositioner>
									<DrawerContent>
										<DrawerBody>
											<VStack separator={<StackSeparator />} p="4">
												{productSubcategories.map(
													(productSubcategory: CategoryProductSubcategory) => (
														<Link
															key={`li-productSubcategory-${productSubcategory.id}`}
															fontSize={20}
															w="full"
															onClick={onCategoryProductSubcategoryMenuItemClick(
																productSubcategory.id
															)}
														>
															<Box
																w="full"
																p="5"
																backgroundColor={
																	productSubcategory.id ===
																	selectedProductSubcategoryId
																		? "teal.100"
																		: "inherit"
																}
															>
																{productSubcategory.name}
															</Box>
														</Link>
													)
												)}
											</VStack>
										</DrawerBody>
									</DrawerContent>
								</DrawerPositioner>
							</DrawerBackdrop>
						</Portal>
					</DrawerRoot>
				</HStack>
			) : (
				<TabsRoot
					value={`${selectedProductSubcategoryId}`}
					variant="subtle"
					onValueChange={onSelectedProductSubcategoryChange}
				>
					<TabsList
						overflowY="hidden"
						css={{
							scrollbarWidth: "none",
							"::WebkitScrollbar": {
								display: "none"
							}
						}}
					>
						{productSubcategories.map(
							(productSubcategory: CategoryProductSubcategory) => (
								<TabsTrigger
									flexShrink={0}
									value={`${productSubcategory.id}`}
									key={`productSubcategory-${productSubcategory.id}`}
								>
									{productSubcategory.name}
								</TabsTrigger>
							)
						)}
					</TabsList>
				</TabsRoot>
			)}
			<Separator w="full" />
			<TabsRoot
				value={`${selectedPrintingTypeId}`}
				variant="subtle"
				onValueChange={onSelectedPrintingTypeChange}
			>
				<TabsList>
					{displayedPrintingTypes.map(
						useCallback(
							(printingType: CategoryPrintingType) => (
								<TabsTrigger
									value={`${printingType.id}`}
									key={`printingType-${printingType.id}`}
								>
									{printingType.name}
								</TabsTrigger>
							),
							[]
						)
					)}
				</TabsList>
			</TabsRoot>
			<Flex w="full" h="full" gap="4" marginTop="0.5rem">
				{isMobile && formValues ? undefined : (
					<VStack
						align="flex-start"
						flex="1"
						gap="4"
						w="full"
						as="form"
						onSubmit={handleSubmit(onSubmit)}
					>
						<VStack
							w="full"
							gap="4"
							css={{ "--field-label-width": "9.375rem" }}
							alignItems="flex-start"
							bg="bg.muted"
							padding="0.75rem"
							borderRadius="0.25rem"
						>
							<Stack w="full" direction={{ base: "column", sm: "row" }}>
								<Flex w={{ sm: "8.625rem" }} alignItems="center" justifyContent="flex-end" gap="1">
									<Text color="red.solid">*</Text>
									<Text
										lineHeight={{ sm: "2.5rem" }}
										textAlign={{ sm: "right" }}
									>
										Size:
									</Text>
								</Flex>
								<FieldRoot
									orientation={{ base: "vertical", md: "horizontal" }}
									justifyContent="flex-start"
									w="auto"
									invalid={!!errors.width}
								>
									<Controller
										name="width"
										control={control}
										rules={getWidthRules()}
										render={({ field }) => (
											<NumberInputRoot
												min={1}
												bg="bg.panel"
												w={{ base: "full" }}
												clampValueOnBlur={true}
												name={field.name}
												value={`${field.value}`}
												onValueChange={useDebouncedCallback(
													({ valueAsNumber }) => {
														field.onChange(valueAsNumber || "");
														if (!isMobile) {
															handleSubmit(onSubmit)();
														}
													},
													DEBOUNCED_WAIT_TIME
												)}
											>
												<NumberInputControl />
												<InputGroup
													endElement={
														<Text lineHeight="2.5rem" paddingRight="1.5rem">
															mm
														</Text>
													}
												>
													<NumberInputInput
														onBlur={field.onBlur}
														placeholder="Width"
													/>
												</InputGroup>
											</NumberInputRoot>
										)}
									/>
									<FieldErrorText>{errors.width?.message}</FieldErrorText>
								</FieldRoot>
								<Text alignSelf={{ base: "center" }}>x</Text>
								<FieldRoot
									orientation={{ base: "vertical", md: "horizontal" }}
									justifyContent="flex-start"
									w="auto"
									invalid={!!errors.height}
								>
									<Controller
										name="height"
										control={control}
										rules={getHeightRules()}
										render={({ field }) => (
											<NumberInputRoot
												min={1}
												bg="bg.panel"
												w={{ base: "full" }}
												clampValueOnBlur={true}
												name={field.name}
												value={`${field.value}`}
												onValueChange={useDebouncedCallback(
													({ valueAsNumber }) => {
														field.onChange(valueAsNumber || "");
														if (!isMobile) {
															handleSubmit(onSubmit)();
														}
													},
													DEBOUNCED_WAIT_TIME
												)}
											>
												<NumberInputControl />
												<InputGroup
													endElement={
														<Text lineHeight="2.5rem" paddingRight="1.5rem">
															mm
														</Text>
													}
												>
													<NumberInputInput
														onBlur={field.onBlur}
														placeholder="Height"
													/>
												</InputGroup>
											</NumberInputRoot>
										)}
									/>
									<FieldErrorText>{errors.height?.message}</FieldErrorText>
								</FieldRoot>
								{hasGusset ? (
									<>
										<Text alignSelf={{ base: "center" }}>x</Text>
										<FieldRoot
											orientation={{ base: "vertical", md: "horizontal" }}
											justifyContent="flex-start"
											w="auto"
											invalid={!!errors.gusset}
										>
											<Controller
												name="gusset"
												control={control}
												render={({ field }) => (
													<NumberInputRoot
														min={1}
														bg="bg.panel"
														w={{ base: "full" }}
														clampValueOnBlur={true}
														name={field.name}
														value={`${field.value}`}
														onValueChange={useDebouncedCallback(
															({ valueAsNumber }) => {
																field.onChange(valueAsNumber || "");
																if (!isMobile) {
																	handleSubmit(onSubmit)();
																}
															},
															DEBOUNCED_WAIT_TIME
														)}
													>
														<NumberInputControl />
														<InputGroup
															endElement={
																<Text lineHeight="2.5rem" paddingRight="1.5rem">
																	mm
																</Text>
															}
														>
															<NumberInputInput
																onBlur={field.onBlur}
																placeholder="Gusset"
															/>
														</InputGroup>
													</NumberInputRoot>
												)}
											/>
											<FieldErrorText>{errors.gusset?.message}</FieldErrorText>
										</FieldRoot>
									</>
								) : null}
							</Stack>
							{caseFields.map((caseField, index: number) => (
								<Box key={`base-case-${index}`} w="full">
									<VStack
										w="full"
										paddingY="0.75rem"
										paddingX={{ base: "0.75rem" }}
										borderRadius="0.25rem"
										position="relative"
										bg="bg.emphasized"
										css={{ "--field-label-width": "8.625rem" }}
										data-state="open"
										_open={{
											animationName: "fade-in, scale-in",
											animationDuration: "300ms"
										}}
										_closed={{
											animationName: "fade-out, scale-out",
											animationDuration: "120ms"
										}}
									>
										<FieldRoot
											orientation={{ base: "vertical", sm: "horizontal" }}
											justifyContent="flex-start"
											w="full"
											invalid={
												suggestedSKUs[index] ||
												!!((errors.cases || [])[index] || {}).numOfStyles
											}
										>
											<FieldLabel
												alignSelf="center"
												justifyContent={{ base: "flex-start", sm: "flex-end" }}
												w={{ base: "full" }}
											>
												<Text color="red.solid">*</Text>
												<Text textAlign="right">
													Number of Styles in the Same Size:
												</Text>
											</FieldLabel>
											<Controller
												name={`cases.${index}.numOfStyles`}
												control={control}
												render={({ field }) => (
													<NumberInputRoot
														min={1}
														bg="bg.panel"
														w={{ base: "full", md: "auto" }}
														disabled={printingTypes.find(({id}) => id === selectedPrintingTypeId)?.name.toLowerCase() === "gravure printing"}
														clampValueOnBlur={true}
														name={field.name}
														value={`${field.value}`}
														onValueChange={useDebouncedCallback(
															({ valueAsNumber }) => {
																field.onChange(valueAsNumber || "");
																setValue(
																	`cases.${index}.totalQuantity`,
																	getValues(`cases.${index}.numOfStyles`) *
																		getValues(`cases.${index}.quantityPerStyle`)
																);
																if (!isMobile) {
																	handleSubmit(onSubmit)();
																}
															},
															DEBOUNCED_WAIT_TIME
														)}
													>
														<NumberInputControl />
														<NumberInputInput onBlur={field.onBlur} />
													</NumberInputRoot>
												)}
											/>
											{
												suggestedSKUs[index]
												?
												(
													<FieldErrorText>
														The optimal SKU count for the current size is a
														multiple of {formValues?.cases[index].numOfMatchedModulus}. Consider increasing
														or decreasing the SKU count for better efficiency.
													</FieldErrorText>
												)
												:
												null
											}
											<FieldErrorText>
												{
													((errors.cases || [])[index] || {}).numOfStyles?.message || ""
												}
											</FieldErrorText>
										</FieldRoot>
										<Stack w="full" direction={{ base: "column", md: "row" }}>
											<FieldRoot
												orientation={{ base: "vertical", sm: "horizontal" }}
												justifyContent="flex-start"
												w="auto"
												invalid={ !!((errors.cases || [])[index] || {}).quantityPerStyle }
											>
												<FieldLabel
													alignSelf="center"
													justifyContent={{
														base: "flex-start",
														sm: "flex-end"
													}}
													w={{ base: "full" }}
												>
													<Text color="red.solid">*</Text>
													<Text textAlign="right">Quantity per Style:</Text>
												</FieldLabel>
												<Controller
													name={`cases.${index}.quantityPerStyle`}
													control={control}
													render={({ field }) => (
														<NumberInputRoot
															min={1}
															bg="bg.panel"
															w={{ base: "full" }}
															clampValueOnBlur={true}
															name={field.name}
															value={`${field.value}`}
															onValueChange={useDebouncedCallback(
																({ valueAsNumber }) => {
																	field.onChange(valueAsNumber || "");
																	setValue(
																		`cases.${index}.totalQuantity`,
																		getValues(`cases.${index}.numOfStyles`) *
																			getValues(
																				`cases.${index}.quantityPerStyle`
																			)
																	);
																	if (!isMobile) {
																		handleSubmit(onSubmit)();
																	}
																},
																DEBOUNCED_WAIT_TIME
															)}
														>
															<NumberInputControl />
															<InputGroup
																endElement={
																	<Text
																		lineHeight="2.5rem"
																		paddingRight="1.5rem"
																	>
																		PCS
																	</Text>
																}
															>
																<NumberInputInput onBlur={field.onBlur} />
															</InputGroup>
														</NumberInputRoot>
													)}
												/>
												<FieldErrorText>
													{
														((errors.cases || [])[index] || {}).quantityPerStyle?.message || ""
													}
												</FieldErrorText>
											</FieldRoot>
											<FieldRoot
												orientation={{ base: "vertical", sm: "horizontal" }}
												justifyContent="flex-start"
												w="auto"
												invalid={
													!!((errors.cases || [])[index] || {}).totalQuantity
												}
											>
												<FieldLabel
													alignSelf="center"
													justifyContent={{
														base: "flex-start",
														sm: "flex-end"
													}}
													w={{ base: "full" }}
												>
													<Text>Total Quantity:</Text>
												</FieldLabel>
												<Controller
													name={`cases.${index}.totalQuantity`}
													control={control}
													render={({ field }) => (
														<NumberInputRoot
															defaultValue={`${field.value}`}
															min={1}
															bg="bg.panel"
															w={{ base: "full" }}
															clampValueOnBlur={true}
															name={field.name}
															value={`${field.value}`}
															disabled
														>
															<NumberInputControl />
															<InputGroup
																endElement={
																	<Text
																		lineHeight="2.5rem"
																		paddingRight="1.5rem"
																	>
																		PCS
																	</Text>
																}
															>
																<NumberInputInput onBlur={field.onBlur} />
															</InputGroup>
														</NumberInputRoot>
													)}
												/>
												<FieldErrorText>
													{
														((errors.cases || [])[index] || {}).totalQuantity?.message || ""
													}
												</FieldErrorText>
											</FieldRoot>
										</Stack>
										{caseFields.length > 1 ? (
											<CloseButton
												size="sm"
												position="absolute"
												top={{ base: "0", md: "1rem" }}
												right={{ base: "0", md: "1rem" }}
												onClick={onDeleteBaseCase(index)}
											/>
										) : null}
									</VStack>
								</Box>
							))}
							<Button
								variant="subtle"
								marginLeft={{ base: 0, sm: "9.75rem" }}
								w={{ base: "full", sm: "auto" }}
								onClick={onAddNewBaseCase}
							>
								<LuPlus />
							</Button>
						</VStack>
						<VStack
							align="flex-start"
							w="full"
							gap="4"
							css={{ "--field-label-width": "9.375rem" }}
						>
							{
								options.map((option: CategoryOption, index: number) => (
									!option.isMaterial && option.suboptions.length > 0)
									|| (
										option.isMaterial
										&& option.suboptions.length > 0
										&& (option as CategoryOption<true>).suboptions.filter(
											(suboption: CategoryMaterialItem | undefined) => suboption?.isVisible
										).length > 0
									)
									?
									(
										<FieldRoot
											orientation={{ base: "vertical", md: "horizontal" }}
											key={`option-${option.id}`}
											alignItems="flex-start"
										>
											<FieldLabel
												alignSelf="flex-start"
												justifyContent="flex-end"
											>
												{
													option.isRequired
													?
													<Text color="red.solid">*</Text>
													:
													null
												}
												<Text fontWeight="bold" lineHeight="2.25rem">
													{option.name}:
												</Text>
											</FieldLabel>
											<VStack w="full">
												{
													option.isMaterial
													?
													renderMaterialItemArea(
														option as CategoryOption<true>,
														index
													)
													:
													renderNonMaterialItemArea(
														option as CategoryOption<false>,
														index
													)}
											</VStack>
										</FieldRoot>
									)
									:
									null
								)
							}
						</VStack>
						<Box p="16" w="full">
							<Button variant="solid" hideFrom="md" w="full" type="submit">
								Submit
							</Button>
						</Box>
					</VStack>
				)}
				{
					(formValues?.cases?.length && isFormValuesValidate(formValues) && isSelectedOptionsValidate(formattedSelectedOptions))
					?
					(
						<VStack
							alignItems="flex-start"
							position={{ base: "absolute", md: "relative" }}
							gap={6}
							w={{ base: "full", md: "25rem" }}
							bg="bg.panel"
							top="0"
							left="0"
							right="0"
							bottom="0"
							data-state="open"
							_open={{
								animationName: "fade-in, scale-in",
								animationDuration: "300ms"
							}}
							_closed={{
								animationName: "fade-out, scale-out",
								animationDuration: "120ms"
							}}
						>
							<Box
								bg="bg.muted"
								w="full"
								p="2"
								borderTopLeftRadius="0.25rem"
								borderTopRightRadius="0.25rem"
							>
								<Heading size="md">Quotation Details for</Heading>
								<Text>
									<Span textTransform="capitalize">
										{
											printingTypes.find(
												({ id }) => id === selectedPrintingTypeId
											)?.name
										}
									</Span>{" "}
									of{" "}
									<Span textTransform="capitalize">{`${
										productSubcategories.find(
											({ id }) => id === selectedProductSubcategoryId
										)?.name
									}s`}</Span>
								</Text>
							</Box>
							<VStack
								alignItems="flex-start"
								p={{ base: "1rem", md: 0 }}
								w="full"
								ref={quotationResultRef}
							>
								<DataListRoot orientation="horizontal" w="full">
									<DataListItem>
										<DataListItemLabel>Product Name</DataListItemLabel>
										<DataListItemValue justifyContent="flex-end">
											{
												productSubcategories.find(
													({ id }) => id === selectedProductSubcategoryId
												)?.name
											}
										</DataListItemValue>
									</DataListItem>
									<DataListItem>
										<DataListItemLabel>Printing Type</DataListItemLabel>
										<DataListItemValue justifyContent="flex-end">
											{
												printingTypes.find(
													({ id }) => id === selectedPrintingTypeId
												)?.name
											}
										</DataListItemValue>
									</DataListItem>
									<DataListItem>
										<DataListItemLabel>Size</DataListItemLabel>
										<DataListItemValue justifyContent="flex-end">
											{formValues?.width || 0}mm x {formValues?.height || 0}mm{hasGusset ? ` x ${formValues?.gusset || 0}mm` : ""}
										</DataListItemValue>
									</DataListItem>
									{formattedSelectedOptions.map(
										(option: CategoryOption) =>
											option.isMaterial ? (
												(option as CategoryOption<true>).suboptions.map(
													(
														materialItem: CategoryMaterialItem | undefined,
														index: number
													) =>
														materialItem ? (
															<Fragment
																key={`option-${option.id}-materialsuboption-${materialItem.id}`}
															>
																{materialItem.suboptions.map(
																	(suboption: CategorySuboption) => (
																		<DataListItem
																			key={`option-${option.id}-materialsuboption-${materialItem.id}-suboption-${suboption.id}`}
																		>
																			<DataListItemLabel>{`${option.name}${
																				option.suboptions.length > 1
																					? ` ${index + 1}`
																					: ""
																			}`}</DataListItemLabel>
																			<DataListItemValue justifyContent="flex-end">
																				{suboption.name}
																			</DataListItemValue>
																		</DataListItem>
																	)
																)}
															</Fragment>
														) : null
												)
											) : (
												<DataListItem key={`option-${option.id}`}>
													<DataListItemLabel>{option.name}</DataListItemLabel>
													<DataListItemValue justifyContent="flex-end" textAlign="right">
														{(option as CategoryOption<false>).suboptions.map(({name}) => name).join(", ")}
													</DataListItemValue>
												</DataListItem>
											)
									)}
								</DataListRoot>
								{formValues.cases.length === 1 ? (
									<>
										<Separator w="full" />
										{renderQutationDetailPanel(formValues.cases[0], 0)}
									</>
								) : (
									<AccordionRoot
										multiple
										defaultValue={Array.from(
											new Array(formValues.cases.length)
										).map((_, index: number) => `${index}`)}
									>
										{formValues.cases.map(
											(caseItem: BaseCaseFormValues, index: number) => (
												<AccordionItem key={`case-${index}`} value={`${index}`}>
													<AccordionItemTrigger>
														<Span flex="1">Quantity (Option {index + 1})</Span>
														<AccordionItemIndicator />
													</AccordionItemTrigger>
													<AccordionItemContent>
														<AccordionItemBody>
															{renderQutationDetailPanel(caseItem, index)}
														</AccordionItemBody>
													</AccordionItemContent>
												</AccordionItem>
											)
										)}
									</AccordionRoot>
								)}
							</VStack>
							<ClipboardRoot w="full" timeout={1000} value={CalculationUtil.formatQuotationText(quotationTextResult)}>
								<ClipboardTrigger asChild w="full">
									<Button variant="surface" size="md">
										<ClipboardIndicator />
										<ClipboardCopyText copied="Copied Quotation Result" />
									</Button>
								</ClipboardTrigger>
							</ClipboardRoot>
							<CloseButton
								hideFrom="md"
								size="sm"
								position="absolute"
								top="1rem"
								right="1rem"
								onClick={() => setFormValues(undefined)}
							/>
						</VStack>
					)
					:
					null
				}
			</Flex>
		</VStack>
	);
}
