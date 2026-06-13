import type { ComponentProps } from "react";
import { type RecipeVariantProps } from "../../../styled-system/css";
declare const buttonRecipe: import("../../../styled-system/types").RecipeRuntimeFn<{
    variant: {
        primary: {
            bg: "primary";
            color: "primary.foreground";
            _hover: {
                bg: "primary.hover";
            };
        };
        secondary: {
            bg: "secondary";
            color: "secondary.foreground";
            _hover: {
                bg: "secondary.hover";
            };
        };
        outline: {
            bg: "background";
            color: "text.primary";
            border: "1px solid";
            borderColor: "border";
            _hover: {
                bg: "accent";
                color: "accent.foreground";
            };
        };
        ghost: {
            bg: "transparent";
            color: "text.primary";
            _hover: {
                bg: "accent";
                color: "accent.foreground";
            };
        };
        link: {
            bg: "transparent";
            color: "primary";
            textUnderlineOffset: "4px";
            _hover: {
                textDecoration: "underline";
            };
            height: "auto";
            px: "0";
            py: "0";
        };
        destructive: {
            bg: "destructive";
            color: "destructive.foreground";
            _hover: {
                bg: "destructive.hover";
            };
        };
    };
    size: {
        sm: {
            px: "4";
            py: "2";
            fontSize: "xs";
        };
        md: {
            px: "6";
            py: "3";
            fontSize: "sm";
        };
        lg: {
            px: "8";
            py: "4";
            fontSize: "md";
        };
        icon: {
            h: "10";
            w: "10";
            px: "0";
        };
    };
}>;
export declare const buttonVariants: import("../../../styled-system/types").RecipeRuntimeFn<{
    variant: {
        primary: {
            bg: "primary";
            color: "primary.foreground";
            _hover: {
                bg: "primary.hover";
            };
        };
        secondary: {
            bg: "secondary";
            color: "secondary.foreground";
            _hover: {
                bg: "secondary.hover";
            };
        };
        outline: {
            bg: "background";
            color: "text.primary";
            border: "1px solid";
            borderColor: "border";
            _hover: {
                bg: "accent";
                color: "accent.foreground";
            };
        };
        ghost: {
            bg: "transparent";
            color: "text.primary";
            _hover: {
                bg: "accent";
                color: "accent.foreground";
            };
        };
        link: {
            bg: "transparent";
            color: "primary";
            textUnderlineOffset: "4px";
            _hover: {
                textDecoration: "underline";
            };
            height: "auto";
            px: "0";
            py: "0";
        };
        destructive: {
            bg: "destructive";
            color: "destructive.foreground";
            _hover: {
                bg: "destructive.hover";
            };
        };
    };
    size: {
        sm: {
            px: "4";
            py: "2";
            fontSize: "xs";
        };
        md: {
            px: "6";
            py: "3";
            fontSize: "sm";
        };
        lg: {
            px: "8";
            py: "4";
            fontSize: "md";
        };
        icon: {
            h: "10";
            w: "10";
            px: "0";
        };
    };
}>;
type ButtonVariants = RecipeVariantProps<typeof buttonRecipe>;
export type ButtonProps = ComponentProps<"button"> & ButtonVariants & {
    asChild?: boolean;
};
export declare const Button: ({ asChild, className, variant, size, ...props }: ButtonProps) => import("react").JSX.Element;
export {};
//# sourceMappingURL=Button.d.ts.map