"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Mockup, MockupFrame } from "@/components/ui/mockup"

interface HeroProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  title: React.ReactNode
  subtitle?: string
  eyebrow?: string
  ctaText?: string
  ctaLink?: string
  mockupImage?: {
    src: string
    alt: string
    width: number
    height: number
  }
}

const Hero = React.forwardRef<HTMLDivElement, HeroProps>(
  ({ className, title, subtitle, eyebrow, ctaText, ctaLink, mockupImage, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("flex flex-col items-center bg-background", className)}
        {...props}
      >
        {eyebrow && (
          <p
            className="uppercase tracking-[0.51em] leading-[133%] text-center text-[19px] mt-[249px] mb-8 text-muted-foreground animate-appear opacity-0"
          >
            {eyebrow}
          </p>
        )}

        <h1
          className="text-[64px] leading-[83px] text-center px-4 lg:px-[314px] text-foreground font-semibold animate-appear opacity-0 delay-100"
        >
          {title}
        </h1>

        {subtitle && (
          <p
            className="text-[28px] text-center font-light px-4 lg:px-[314px] mt-[25px] mb-[48px] leading-[133%] text-muted-foreground animate-appear opacity-0 delay-300"
          >
            {subtitle}
          </p>
        )}

        {ctaText && ctaLink && (
          <Link href={ctaLink}>
            <div
              className="inline-flex items-center bg-primary text-primary-foreground rounded-[10px] hover:bg-primary-hover transition-colors w-[227px] h-[49px] animate-appear opacity-0 delay-500"
            >
              <div className="flex items-center justify-between w-full pl-[22px] pr-[17px]">
                <span className="text-[19px] whitespace-nowrap">{ctaText}</span>
                <div className="flex items-center gap-[14px]">
                  <div className="w-[36px] h-[15px] relative">
                    <Image
                      src="https://res.cloudinary.com/ducqjmtlk/image/upload/v1737918196/Arrow_1_tacbar.svg"
                      alt="Arrow"
                      width={36}
                      height={15}
                      className="object-contain brightness-0 invert"
                    />
                  </div>
                </div>
              </div>
            </div>
          </Link>
        )}

        {mockupImage && (
          <div className="mt-20 w-full relative animate-appear opacity-0 delay-700">
            <MockupFrame>
              <Mockup type="responsive">
                <Image
                  src={mockupImage.src}
                  alt={mockupImage.alt}
                  width={mockupImage.width}
                  height={mockupImage.height}
                  className="w-full"
                  priority
                />
              </Mockup>
            </MockupFrame>
            <div className="absolute bottom-0 left-0 right-0 w-full h-[303px] z-10 bg-gradient-to-t from-background to-transparent" />
          </div>
        )}
      </div>
    )
  }
)
Hero.displayName = "Hero"

export { Hero }
