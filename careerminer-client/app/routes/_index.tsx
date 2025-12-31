import { useLoaderData } from "react-router";

export async function loader() {
    return null;
}

export default function Component() {
    const loaderData = useLoaderData<typeof loader>();

    return (
        <div>
            <div className="flex flex-row w-full place-content-center text-black font-bold">
                sample text
            </div>
        </div>
    );
}