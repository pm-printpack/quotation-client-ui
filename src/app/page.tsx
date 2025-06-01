"use client";
import { fetchAllPrintingTypes, fetchAllProductSubcategories, fetchCategoryOptions, CategoryOption, PrintingType, ProductSubcategory, CategorySuboption, CategoryMaterialSuboption, hideMaterialSuboption, showMaterialSuboption1By1 } from "@/lib/features/categories.slice";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { RootState } from "@/lib/store";
import { Box, Button, Center, CloseButton, FieldErrorText, FieldLabel, FieldRoot, Flex, HStack, InputGroup, NumberInputControl, NumberInputInput, NumberInputRoot, RadioCardItem, RadioCardItemHiddenInput, RadioCardItemText, RadioCardRoot, Separator, SimpleGrid, StackSeparator, TabsList, TabsRoot, TabsTrigger, Text, VStack } from "@chakra-ui/react";
import { useCallback, useEffect, useState } from "react";
import { LuPlus } from "react-icons/lu";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import styles from "./page.module.css";

type BaseCaseFormValues = {
  numOfSame?: number;
  numOfSingle?: number;
  totalNumber?: number;
} & Record<string, number>;

type FormValues = {
  width: number;
  height: number;
  cases: BaseCaseFormValues[];
};

export default function Home() {
  const isAuthenticated: boolean = useAppSelector((state: RootState) => state.auth.isAuthenticated);
  
  if (!isAuthenticated) {
    return undefined;
  }

  const dispatch = useAppDispatch();
  const productSubcategories: ProductSubcategory[] = useAppSelector((state: RootState) => state.categories.productSubcategories);
  const printingTypes: PrintingType[] = useAppSelector((state: RootState) => state.categories.printingTypes);
  const options: CategoryOption[] = useAppSelector((state: RootState) => state.categories.options);
  const [selectedProductSubcategoryId, setSelectedProductSubcategoryId] = useState<number>(productSubcategories[0]?.id);
  const [selectedPrintingTypeId, setSelectedPrintingTypeId] = useState<number>(printingTypes[0]?.id);
  const [selectedOptionRecords, setSelectedOptionRecords] = useState<Record<number, CategoryOption<boolean>>>([]);
  const {
    control,
    handleSubmit,
    formState: { errors }
  } = useForm<FormValues>({
    defaultValues: {
      width: 1,
      height: 1,
      cases: [{
        numOfSame: 1,
        numOfSingle: 100,
        totalNumber: 1000
      }]
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

  useEffect(() => {
    dispatch(fetchAllProductSubcategories());
    dispatch(fetchAllPrintingTypes());
  }, [dispatch]);

  useEffect(() => {
    if (!selectedProductSubcategoryId) {
      setSelectedProductSubcategoryId(productSubcategories[0]?.id);
    }
  }, [selectedProductSubcategoryId, productSubcategories]);

  useEffect(() => {
    if (!selectedPrintingTypeId) {
      setSelectedPrintingTypeId(printingTypes[0]?.id);
    }
  }, [selectedPrintingTypeId, printingTypes]);

  useEffect(() => {
    if (selectedProductSubcategoryId && selectedPrintingTypeId) {
      dispatch(fetchCategoryOptions({
        categoryProductSubcategoryId: selectedProductSubcategoryId,
        categoryPrintingTypeId: selectedPrintingTypeId
      })).unwrap();
    }
  }, [selectedProductSubcategoryId, selectedPrintingTypeId]);

  const onAddNewBaseCase = useCallback(() => {
    appendCase({
      numOfSame: 1,
      numOfSingle: 100,
      totalNumber: 1000
    });
  }, [appendCase]);

  const onDeleteBaseCase = useCallback((index: number) => {
    return () => {
      removeCase(index);
    };
  }, [removeCase]);

  const onAddMaterialCategorySuboption = useCallback((option: CategoryOption<true>) => {
    return () => {
      dispatch(showMaterialSuboption1By1(option.id));
    };
  }, []);

  const onDeleteMaterialCategorySuboption = useCallback((option: CategoryOption<true>, materialSuboptionId: number) => {
    return () => {
      dispatch(hideMaterialSuboption({
        optionId: option.id,
        suboptionId: materialSuboptionId
      }));
      if (selectedOptionRecords[option.id]) {
        const materialSuboptionIndex: number = (selectedOptionRecords[option.id] as CategoryOption<true>).suboptions.findIndex((materialSuboption: CategoryMaterialSuboption | undefined) => materialSuboption?.id === materialSuboptionId);
        if (materialSuboptionIndex > -1) {
          (selectedOptionRecords[option.id] as CategoryOption<true>).suboptions[materialSuboptionIndex] = undefined;
          setSelectedOptionRecords({...selectedOptionRecords});
        }
      }
    };
  }, [selectedOptionRecords]);

  const getSelectedValueOfMaterialSuboption = useCallback((option: CategoryOption<true>, materialSuboptionId: number): string | undefined => {
    const selectedOption: CategoryOption | undefined = selectedOptionRecords[option.id];
    if (selectedOption) {
      const selectedMaterialOption: CategoryOption<true> = selectedOption as CategoryOption<true>;
      const selectedMaterialSuboption: CategoryMaterialSuboption | undefined = selectedMaterialOption.suboptions.find((materialSuboption: CategoryMaterialSuboption | undefined) => materialSuboption?.id === materialSuboptionId);
      if (selectedMaterialSuboption && selectedMaterialSuboption.suboptions?.length > 0) {
        return `${selectedMaterialSuboption.suboptions[0].id}`;
      }
    }
    return undefined;
  }, [selectedOptionRecords]);

  const setSelectedValueOfMaterialSuboption = useCallback((option: CategoryOption<true>, materialSuboptionId: number) => {
    return ({ value: selectedSuboptionId }: {value: string | null}) => {
      const selectedOption: CategoryOption | undefined = selectedOptionRecords[option.id];
      if (!selectedOption) {
        selectedOptionRecords[option.id] = {
          ...option,
          suboptions: []
        };
      }
      const materialSuboptionIndex: number = option.suboptions.findIndex((materialSuboption: CategoryMaterialSuboption | undefined) => materialSuboption?.id === materialSuboptionId);
      if (materialSuboptionIndex > -1) {
        const materialSuboption: CategoryMaterialSuboption | undefined = option.suboptions.find((materialSuboption: CategoryMaterialSuboption | undefined) => materialSuboption?.id === materialSuboptionId);
        if (!selectedOptionRecords[option.id].suboptions[materialSuboptionIndex] && materialSuboption) {
          selectedOptionRecords[option.id].suboptions[materialSuboptionIndex] = {
            ...materialSuboption,
            suboptions: []
          };
        }
        if (materialSuboption && materialSuboption.shown) {
          const selectedSuboption: CategorySuboption | undefined = materialSuboption.suboptions.find((suboption: CategorySuboption) => suboption.id === Number(selectedSuboptionId));
          if (selectedSuboption) {
            const selectedMaterialSuboption: CategoryMaterialSuboption | undefined = (selectedOptionRecords[option.id] as CategoryOption<true>).suboptions[materialSuboptionIndex];
            if (selectedMaterialSuboption) {
              selectedMaterialSuboption.suboptions[0] = selectedSuboption;
            }
          } else {
            selectedOptionRecords[option.id].suboptions[materialSuboptionIndex] = undefined;
          }
          setSelectedOptionRecords({...selectedOptionRecords});
        }
      }
    };
  }, [selectedOptionRecords]);

  const getSelectedValueOfNonMaterialSuboption = useCallback((option: CategoryOption<false>): string | undefined => {
    const selectedOption: CategoryOption | undefined = selectedOptionRecords[option.id];
    if (selectedOption) {
      return `${(selectedOption as CategoryOption<false>).suboptions[0].id}`;
    }
    return undefined;
  }, [selectedOptionRecords]);

  const setSelectedValueOfNonMaterialSuboption = useCallback((option: CategoryOption<false>) => {
    return ({ value: selectedSuboptionId }: {value: string | null}) => {
      let selectedOption: CategoryOption | undefined = selectedOptionRecords[option.id];
      if (!selectedOption) {
        selectedOptionRecords[option.id] = {
          ...option,
          suboptions: []
        };
      }
      if (selectedSuboptionId) {
        selectedOptionRecords[option.id].suboptions = option.suboptions.filter((suboption: CategorySuboption) => suboption.id === Number(selectedSuboptionId));
        setSelectedOptionRecords({...selectedOptionRecords});
      }
    };
  }, [selectedOptionRecords]);

  const onSubmit = useCallback((values: FormValues) => {
    console.log(values);
    console.log("selectedOptionRecords: ", selectedOptionRecords);
  }, [selectedOptionRecords]);

  const onSelectedProductSubcategoryChange = useCallback(({value}: {value: string}) => setSelectedProductSubcategoryId(Number(value)), []);

  const onSelectedPrintingTypeChange = useCallback(({value}: {value: string}) => setSelectedPrintingTypeId(Number(value)), []);

  const renderMaterialSuboptionArea = useCallback((option: CategoryOption<true>, index: number) => {
    return (
      <VStack w="full" align="flex-start" {...(option.suboptions.length > 1 ? {bg: "bg.muted", p: "0.75rem", borderRadius: "0.25rem"} : {})}>
        {
          option.suboptions.map((materialSuboption: CategoryMaterialSuboption | undefined, suboptionIndex: number) => {
            if (!materialSuboption || !materialSuboption.shown) {
              return undefined;
            }
            return (
              <Flex
                key={`materialSuboption-${materialSuboption.id}`}
                w="full"
                direction="row"
                gap="4"
                align="flex-start"
                {
                  ...(
                    option.suboptions.length > 1
                    ?
                    {
                      padding: "0.75rem",
                      borderRadius: "0.25rem",
                      position: "relative",
                      bg: "bg.emphasized",
                      css: {"--field-label-width": "8.625rem"},
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
                    :
                    {}
                  )
                }
              >
                {
                  option.suboptions.length > 1
                  ?
                  <Text textAlign="right">{`${option.name} ${suboptionIndex + 1}:`}</Text>
                  :
                  null
                }
                <RadioCardRoot
                  orientation="vertical"
                  align="center"
                  w="full"
                  variant="outline"
                  // key={`category-option-${option.id}-sub-${suboptionIndex}`}
                  value={getSelectedValueOfMaterialSuboption(option, materialSuboption.id)}
                  onValueChange={setSelectedValueOfMaterialSuboption(option, materialSuboption.id)}
                  // value={`${field.value}`}
                  // onValueChange={setSelectedValueOfMaterialSuboption}
                >
                  <SimpleGrid w="full" gap={4} templateColumns="repeat(auto-fit, minmax(10rem, 10rem))">
                    {
                      materialSuboption.suboptions.map((suboption: CategorySuboption) => (
                        <RadioCardItem key={`suboption-${suboption.id}`} value={`${suboption.id}`} className={styles.radioCardItem}>
                          <RadioCardItemHiddenInput />
                          <RadioCardItemText>
                            <Center p="2" fontSize="sm">{suboption.name}</Center>
                          </RadioCardItemText>
                        </RadioCardItem>
                      ))
                    }
                  </SimpleGrid>
                </RadioCardRoot>
                {
                  option.suboptions.filter((materialSuboption: CategoryMaterialSuboption | undefined) => materialSuboption?.shown).length > 1
                  ?
                  <CloseButton size="sm" position="absolute" top="0" right="0" onClick={onDeleteMaterialCategorySuboption(option, materialSuboption.id)}/>
                  :
                  null
                }
              </Flex>
            );
          })
        }
        {
          (option.suboptions.length > 1 && option.suboptions.filter((suboption: CategoryMaterialSuboption | undefined) => suboption?.shown).length < option.suboptions.length)
          ?
          <Button variant="subtle" w="full" onClick={onAddMaterialCategorySuboption(option)}>
            <LuPlus />
          </Button>
          :
          null
        }
      </VStack>
    );
  }, []);

  const renderNonMaterialSuboptionArea = useCallback((option: CategoryOption<false>, index: number) => {
    return (
      <RadioCardRoot
        orientation="vertical"
        align="center"
        w="full"
        variant="outline"
        key={`category-option-${option.id}`}
        value={getSelectedValueOfNonMaterialSuboption(option)}
        onValueChange={setSelectedValueOfNonMaterialSuboption(option)}
      >
        <SimpleGrid w="full" gap={4} templateColumns="repeat(auto-fit, minmax(10rem, 10rem))">
          {
            option.suboptions.map((suboption: CategorySuboption) => (
              <RadioCardItem key={`suboption-${suboption.id}`} value={`${suboption.id}`} className={styles.radioCardItem}>
                <RadioCardItemHiddenInput />
                <RadioCardItemText>
                  <Center p="2" fontSize="sm">{suboption.name}</Center>
                </RadioCardItemText>
              </RadioCardItem>
            ))
          }
        </SimpleGrid>
      </RadioCardRoot>
    );
  }, [control]);

  return (
    <VStack w="full" h="full" p="4" align="flex-start">
      <TabsRoot
        value={`${selectedProductSubcategoryId}`}
        variant="subtle"
        onValueChange={onSelectedProductSubcategoryChange}
      >
        <TabsList>
          {
            productSubcategories.map((productSubcategory: ProductSubcategory) => (
              <TabsTrigger value={`${productSubcategory.id}`} key={`productSubcategory-${productSubcategory.id}`}>
                {productSubcategory.name}
              </TabsTrigger>
            ))
          }
        </TabsList>
      </TabsRoot>
      <Separator w="full" />
      <TabsRoot
        value={`${selectedPrintingTypeId}`}
        variant="subtle"
        onValueChange={onSelectedPrintingTypeChange}
      >
        <TabsList>
          {
            printingTypes.map((printingType: PrintingType) => (
              <TabsTrigger value={`${printingType.id}`} key={`printingType-${printingType.id}`}>
                {printingType.name}
              </TabsTrigger>
            ))
          }
        </TabsList>
      </TabsRoot>
      <Flex w="full" h="full" gap="4" marginTop="0.5rem">
        <VStack align="flex-start" flex="1" gap="4" as="form" onSubmit={handleSubmit(onSubmit)}>
          <VStack
            w="full"
            gap="4"
            css={{ "--field-label-width": "9.375rem" }}
            bg="bg.muted"
            paddingY="0.75rem"
            borderRadius="0.25rem"
          >
            <HStack w="full">
              <FieldRoot orientation="horizontal" justifyContent="flex-start" w="auto" invalid={!!errors.width}>
                <FieldLabel alignSelf="flex-start" justifyContent="flex-end">
                  <Text lineHeight="2.5rem">Size:</Text>
                </FieldLabel>
                <Controller
                  name="width"
                  control={control}
                  render={({ field }) => (
                    <NumberInputRoot
                      defaultValue="1"
                      min={1}
                      bg="bg.panel"
                      clampValueOnBlur={true}
                      name={field.name}
                      value={`${field.value}`}
                      onValueChange={({ valueAsNumber }) => {
                        field.onChange(valueAsNumber || 1)
                      }}
                    >
                      <NumberInputControl />
                      <InputGroup endElement={<Text lineHeight="2.5rem" paddingRight="1.5rem">mm</Text>}>
                        <NumberInputInput onBlur={field.onBlur}/>
                      </InputGroup>
                    </NumberInputRoot>
                  )}
                />
                <FieldErrorText>{errors.width?.message}</FieldErrorText>
              </FieldRoot>
              <Text>x</Text>
              <FieldRoot orientation="horizontal" justifyContent="flex-start" w="auto" invalid={!!errors.height}>
                <Controller
                  name="height"
                  control={control}
                  render={({ field }) => (
                    <NumberInputRoot
                      defaultValue="1"
                      min={1}
                      bg="bg.panel"
                      clampValueOnBlur={true}
                      name={field.name}
                      value={`${field.value}`}
                      onValueChange={({ valueAsNumber }) => {
                        field.onChange(valueAsNumber || 1)
                      }}
                    >
                      <NumberInputControl />
                      <InputGroup endElement={<Text lineHeight="2.5rem" paddingRight="1.5rem">mm</Text>}>
                        <NumberInputInput onBlur={field.onBlur}/>
                      </InputGroup>
                    </NumberInputRoot>
                  )}
                />
                <FieldErrorText>{errors.height?.message}</FieldErrorText>
              </FieldRoot>
            </HStack>
            {
              caseFields.map((caseField, index: number) => (
                <Box key={`base-case-${index}`} paddingX="0.75rem" w="full">
                  <VStack
                    w="full"
                    paddingY="0.75rem"
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
                    <FieldRoot orientation="horizontal" justifyContent="flex-start" w="full" invalid={!!((errors.cases || [])[index] || {}).numOfSame}>
                      <FieldLabel alignSelf="flex-start" justifyContent="flex-end">
                        <Text textAlign="right">Number of styles of the same size:</Text>
                      </FieldLabel>
                      <Controller
                        name={`cases.${index}.numOfSame`}
                        control={control}
                        render={({ field }) => (
                          <NumberInputRoot
                            defaultValue={`${field.value}`}
                            min={1}
                            bg="bg.panel"
                            clampValueOnBlur={true}
                            name={field.name}
                            value={`${field.value}`}
                            onValueChange={({ valueAsNumber }) => {
                              field.onChange(valueAsNumber || 1);
                            }}
                          >
                            <NumberInputControl />
                            <NumberInputInput onBlur={field.onBlur}/>
                          </NumberInputRoot>
                        )}
                      />
                      <FieldErrorText>{(((errors.cases || [])[index] || {}).numOfSame || "") as string}</FieldErrorText>
                    </FieldRoot>
                    <HStack w="full">
                      <FieldRoot orientation="horizontal" justifyContent="flex-start" w="auto" invalid={!!((errors.cases || [])[index] || {}).numOfSingle}>
                        <FieldLabel alignSelf="flex-start" justifyContent="flex-end">
                          <Text textAlign="right">Number of single styles:</Text>
                        </FieldLabel>
                        <Controller
                          name={`cases.${index}.numOfSingle`}
                          control={control}
                          render={({ field }) => (
                            <NumberInputRoot
                              defaultValue={`${field.value}`}
                              min={1}
                              bg="bg.panel"
                              clampValueOnBlur={true}
                              name={field.name}
                              value={`${field.value}`}
                              onValueChange={({ valueAsNumber }) => {
                                field.onChange(valueAsNumber || 1)
                              }}
                            >
                              <NumberInputControl />
                              <InputGroup endElement={<Text lineHeight="2.5rem" paddingRight="1.5rem">PCS</Text>}>
                                <NumberInputInput onBlur={field.onBlur}/>
                              </InputGroup>
                            </NumberInputRoot>
                          )}
                        />
                        <FieldErrorText>{(((errors.cases || [])[index] || {}).numOfSingle || "") as string}</FieldErrorText>
                      </FieldRoot>
                      <FieldRoot orientation="horizontal" justifyContent="flex-start" w="auto" invalid={!!((errors.cases || [])[index] || {}).totalNumber}>
                        <FieldLabel alignSelf="flex-start" justifyContent="flex-end">
                          <Text lineHeight="2.5rem">Total number:</Text>
                        </FieldLabel>
                        <Controller
                          name={`cases.${index}.totalNumber`}
                          control={control}
                          render={({ field }) => (
                            <NumberInputRoot
                              defaultValue={`${field.value}`}
                              min={1}
                              bg="bg.panel"
                              clampValueOnBlur={true}
                              name={field.name}
                              value={`${field.value}`}
                              onValueChange={({ valueAsNumber }) => {
                                field.onChange(valueAsNumber || 1)
                              }}
                            >
                              <NumberInputControl />
                              <InputGroup endElement={<Text lineHeight="2.5rem" paddingRight="1.5rem">PCS</Text>}>
                                <NumberInputInput onBlur={field.onBlur}/>
                              </InputGroup>
                            </NumberInputRoot>
                          )}
                        />
                        <FieldErrorText>{(((errors.cases || [])[index] || {}).totalNumber || "") as string}</FieldErrorText>
                      </FieldRoot>
                    </HStack>
                    {
                      caseFields.length > 1
                      ?
                      <CloseButton size="sm" position="absolute" top="1rem" right="1rem" onClick={onDeleteBaseCase(index)}/>
                      :
                      null
                    }
                  </VStack>
                </Box>
              ))
            }
            <FieldRoot orientation="horizontal" justifyContent="flex-start" w="full">
              <FieldLabel>
                <Text textAlign="right"></Text>
              </FieldLabel>
              <Button variant="subtle" onClick={onAddNewBaseCase}>
                <LuPlus />
              </Button>
            </FieldRoot>
            <Button variant="solid" type="submit">Submit</Button>
          </VStack>
          <VStack align="flex-start" w="full" gap="4" css={{ "--field-label-width": "9.375rem" }}>
            {
              options.map((option: CategoryOption, index: number) => {
                return (
                  ((!option.isMaterial && option.suboptions.length > 0) || (option.isMaterial && option.suboptions.length > 0 && (option as CategoryOption<true>).suboptions.filter((suboption: CategoryMaterialSuboption | undefined) => suboption?.shown).length > 0))
                  ?
                  <FieldRoot orientation="horizontal" key={`option-${option.id}`} alignItems="flex-start">
                    <FieldLabel alignSelf="flex-start" justifyContent="flex-end">
                      <Text fontWeight="bold" lineHeight="2.25rem">{option.name}:</Text>
                    </FieldLabel>
                    <VStack w="full">
                      {
                        option.isMaterial
                        ?
                        renderMaterialSuboptionArea(option as CategoryOption<true>, index)
                        :
                        renderNonMaterialSuboptionArea(option as CategoryOption<false>, index)
                      }
                      {/* {
                        option.isMaterial
                        ?
                        <Button variant="solid" w="full">
                          <LuPlus />
                        </Button>
                        :
                        null
                      } */}
                    </VStack>
                  </FieldRoot>
                  :
                  null
                );
              })
            }
          </VStack>
        </VStack>
        <Box w="350px" bg="red.400"></Box>
      </Flex>
    </VStack>
  );
}
