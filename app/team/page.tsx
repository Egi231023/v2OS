import {requireChatGPTUser} from '@/app/chatgpt-auth';
import Team from './team';
export const dynamic='force-dynamic';
export const metadata={title:'Team workspaces · ProjectOS',robots:{index:false,follow:false}};
export default async function Page(){await requireChatGPTUser('/team');return <Team/>}
