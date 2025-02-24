import { Progress } from '../ui/progress';

export function LoadingState({ loadingProgress }) {
    return (
        <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center gap-4">
            <span className="text-text-primary">Loading notes...</span>
            <Progress value={loadingProgress} className="w-64" />
        </div>
    );
}