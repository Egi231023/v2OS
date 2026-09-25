import {requireChatGPTUser} from '@/app/chatgpt-auth';
import Reports from './reports';
export const dynamic='force-dynamic';
export const metadata={title:'Reports · ProjectOS',robots:{index:false,follow:false}};
export default async function Page(){await requireChatGPTUser('/reports');return <Reports/>}
