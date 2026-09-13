import { SVGAttributes } from 'react';

export default function AppLogoIcon(props: SVGAttributes<SVGElement>) {
    return (
        <svg {...props} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Bees360 logo">
            <path d="M19 23C12 17 9 23 12 29C14 33 20 33 24 30" fill="currentColor" opacity="0.32" />
            <path d="M45 23C52 17 55 23 52 29C50 33 44 33 40 30" fill="currentColor" opacity="0.32" />
            <path d="M26 18C25 13 21 11 18 12M38 18C39 13 43 11 46 12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            <rect x="21" y="16" width="22" height="31" rx="11" fill="currentColor" />
            <path d="M22 26H42M22 35H42" stroke="white" strokeWidth="4" opacity="0.9" />
            <circle cx="28" cy="22" r="1.8" fill="white" />
            <circle cx="36" cy="22" r="1.8" fill="white" />
            <path d="M28 42L32 49L36 42" fill="currentColor" />
            <text x="32" y="60" fill="currentColor" textAnchor="middle" fontSize="10" fontWeight="900" letterSpacing="0.4">
                360
            </text>
        </svg>
    );
}
