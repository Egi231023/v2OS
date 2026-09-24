import type {Metadata} from 'next';
import './globals.css';
import {Toaster} from '@/components/ui/sonner';
export const metadata:Metadata={title:'ProjectOS — Every home. Every step.',description:'One connected workspace for residential sales, delivery and customer care.',icons:{icon:'/favicon.svg'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}<Toaster position="bottom-right"/></body></html>}
