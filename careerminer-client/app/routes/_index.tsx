import { useLoaderData } from "react-router";
import type { ScrapedData } from "~/models/scraped-data";

export async function loader() {
    const dataResponse: Response = await fetch('http://localhost:8080/data/job-information/get', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Sample'
        }, 
    });

    if (dataResponse.status !== 200) {
        throw new Response(null, { status: 500 });
    }

    const data: ScrapedData[] = await dataResponse.json();

    return data;
}

export default function Component() {
    const loaderData: ScrapedData[] = useLoaderData<typeof loader>();

    return (
        <div>
            <div className="flex flex-row w-full place-content-center text-black font-bold">
                sample text
            </div>
        </div>
    );
}