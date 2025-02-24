export function ErrorState({ error }) {
    return (
        <div className="min-h-screen bg-bg-primary flex items-center justify-center">
            <span className="text-text-primary">Error: {error.message}</span>
        </div>
    );
}