import fs from "fs";
import path from "path";

export class PipelineLogger {
    private filePath: string;
    private buffer: any[] = [];

    constructor(private documentId: number) {
        const dir = path.join(process.cwd(), "logs");

        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        this.filePath = path.join(
            dir,
            `doc-${documentId}-${Date.now()}.log.jsonl`
        );
    }

    private write(entry: any) {
        const line = JSON.stringify({
            time: new Date().toISOString(),
            ...entry,
        });

        fs.appendFileSync(this.filePath, line + "\n");
    }

    step(stage: string, message: string, data?: any) {
        this.write({
            type: "step",
            stage,
            message,
            data,
        });
    }

    progress(stage: string, percent: number, meta?: any) {
        this.write({
            type: "progress",
            stage,
            percent,
            meta,
        });
    }

    error(stage: string, error: any) {
        this.write({
            type: "error",
            stage,
            message: error?.message || String(error),
            stack: error?.stack,
        });
    }

    raw(label: string, data: any) {
        this.write({
            type: "raw",
            label,
            data,
        });
    }

    getPath() {
        return this.filePath;
    }
}