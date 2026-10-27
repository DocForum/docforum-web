import { useForm, type UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

/**
 * Thin wrapper around react-hook-form's `useForm` pre-wired with a Zod
 * resolver, matching docforum-core's validation style (schema-first,
 * descriptive messages). Returns the form methods with the data shape
 * inferred from the schema.
 */
// The three `any`s are the schema's input/output/internal slots; `z.output<T>`
// below is what callers actually get. Narrowing them here would fight zod's
// generic variance without improving type safety at the call sites.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useZodForm<T extends z.ZodType<any, any, any>>(
  schema: T,
  defaultValues: z.output<T>,
): UseFormReturn<z.output<T>> {
  const form = useForm({
    // react-hook-form and Zod disagree about the resolver's generic shape;
    // the cast is contained here and the public return type is exact.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as unknown as any,
    defaultValues,
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });
  return form as unknown as UseFormReturn<z.output<T>>;
}
