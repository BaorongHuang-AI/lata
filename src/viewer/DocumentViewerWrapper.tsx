import { useParams } from "react-router-dom";
import DocumentViewer from "./DocumentViewer";

export default function DocumentViewerWrapper() {
    const { id } = useParams();

    return <DocumentViewer docId={Number(id)} />;
}