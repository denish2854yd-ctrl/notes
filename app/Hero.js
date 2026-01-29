import { User2Icon } from 'lucide-react'
import Image from 'next/image'
import React from 'react'

const Hero = () => {
    return (
        <div className='flex lg:flex-row flex-col items-center justify-evenly gap-10 w-full min-h-screen p-4'>
            <div className='animate-fadeIn space-y-4'>
                <p className="text-6xl font-bold text-center">
                    {process.env.NEXT_PUBLIC_USERNAME || 'Your Name Here'}
                </p>
                <p className="text-lg text-muted-foreground text-center">
                    A personal website.
                </p>
            </div>
            <div className='animate-fadeIn group'>
                {process.env.NEXT_PUBLIC_LOGO ?
                    <Image
                        src={`/${process.env.NEXT_PUBLIC_LOGO}`}
                        alt="Logo"
                        priority
                        width={400}
                        height={400}
                        className='rounded-2xl shadow-lg transition-transform duration-300 group-hover:scale-[1.02]'
                    /> : <User2Icon className="w-40 h-40" />}
            </div>
        </div>
    )
}
// <p className="text-lg text-gray-600 text-center">I&apos;m a computer science student passionate about tech, math, and self-improvement. I enjoy exploring complex ideas and building practical solutions. Always learning, always evolving. Let&apos;s connect! Let me know if you&apos;d like any tweaks!</p>
export default Hero