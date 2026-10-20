import { useForm, type UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

/**
 * Thin wrapper around react-hook-form's `useForm` pre-wired with a Zod
 * resolver, matching docforum-core's validation style (schema-first,
 * descriptive messages). Returns the form methods with the data shape
 * inferred from the schema.
 */
export function useZodForm<T extends z.ZodType<any, any, any>>(
  schema: T,
  defaultValues: z.output<T>,
): UseFormReturn<z.output<T>> {
  const form = useForm({
    resolver: zodResolver(schema) as unknown as any,
    defaultValues,
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });
  return form as unknown as UseFormReturn<z.output<T>>;
}
