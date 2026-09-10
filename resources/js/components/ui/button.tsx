import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-bold ring-offset-background transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[#d78b16]/55 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:border-[#d8c7a9] disabled:bg-[#eee7dc] disabled:text-[#8f806c] disabled:opacity-100 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
    {
        variants: {
            variant: {
                default: 'border border-[#b96c00] bg-[#c97900] text-white shadow-sm hover:border-[#945600] hover:bg-[#a96000] hover:text-white',
                destructive: 'border border-[#bd3f35] bg-[#c94b40] text-white shadow-sm hover:border-[#9f3028] hover:bg-[#a93830] hover:text-white',
                outline: 'border border-[#d8bd8c] bg-[#fffdf8] text-[#6f4a1c] shadow-sm hover:border-[#c98a20] hover:bg-[#fff0ce] hover:text-[#4a351d]',
                secondary: 'border border-[#e2c98e] bg-[#fff2cf] text-[#704500] shadow-sm hover:border-[#d19a32] hover:bg-[#ffe3a0] hover:text-[#4f3000]',
                ghost: 'text-[#654b2d] hover:bg-[#fff0ce] hover:text-[#4a351d]',
                link: 'text-[#a45f00] underline-offset-4 hover:text-[#714000] hover:underline',
            },
            size: {
                default: 'h-10 px-4 py-2',
                sm: 'h-9 rounded-md px-3',
                lg: 'h-11 rounded-md px-8',
                icon: 'h-10 w-10',
            },
        },
        defaultVariants: {
            variant: 'default',
            size: 'default',
        },
    },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
    asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
});
Button.displayName = 'Button';

export { Button, buttonVariants };
