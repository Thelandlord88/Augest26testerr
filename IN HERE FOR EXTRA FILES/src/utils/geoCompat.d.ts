export declare function primeGeoCompat(): Promise<void>;
export declare function representativeOfCluster(cluster: string): Promise<string | null>;
export declare function representativeOfClusterSync(cluster: string): string | null;
export declare function getSuburbsForClusterAsync(cluster: string): Promise<string[]>;
export declare function getSuburbsForClusterSync(cluster: string): string[];
export declare function isGeoCompatPrimed(): boolean;
