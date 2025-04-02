import { HTMLAttributes } from 'react'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {}
export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {}
export interface CardContentProps extends HTMLAttributes<HTMLDivElement> {}
export interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {}
export interface CardDescriptionProps extends HTMLAttributes<HTMLParagraphElement> {}

export const Card: React.FC<CardProps>
export const CardHeader: React.FC<CardHeaderProps>
export const CardContent: React.FC<CardContentProps>
export const CardTitle: React.FC<CardTitleProps>
export const CardDescription: React.FC<CardDescriptionProps> 