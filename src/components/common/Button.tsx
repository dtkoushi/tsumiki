import React from 'react';
import { clsx } from 'clsx';

type Variant = 'default' | 'primary' | 'danger' | 'ghost';
type Size = 'sm' | 'md';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: Variant;
    size?: Size;
    leftIcon?: React.ReactNode;
}

const variantStyles: Record<Variant, string> = {
    default: 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50',
    primary: 'bg-blue-600 border border-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-200',
    danger: 'bg-red-600 border border-red-600 text-white hover:bg-red-700',
    ghost: 'bg-transparent border border-transparent text-slate-600 hover:bg-slate-100',
};

const sizeStyles: Record<Size, string> = {
    sm: 'px-2.5 py-1 text-xs',
    md: 'px-3 py-1.5 text-xs',
};

export const Button: React.FC<ButtonProps> = ({
    variant = 'default',
    size = 'md',
    leftIcon,
    children,
    className,
    ...rest
}) => {
    return (
        <button
            className={clsx(
                'font-medium rounded transition flex items-center gap-1.5',
                variantStyles[variant],
                sizeStyles[size],
                className
            )}
            {...rest}
        >
            {leftIcon}
            {children}
        </button>
    );
};
