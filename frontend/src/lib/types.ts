export type PropertyType =
	| 'string'
	| 'integer'
	| 'float'
	| 'boolean'
	| 'datetime'
	| 'stringList';

export interface PropertySpec {
	name: string;
	type: PropertyType;
}

export interface LabelSpec {
	name: string;
	properties: PropertySpec[];
}

export interface EdgeSpec {
	from: string;
	type: string;
	to: string;
	properties?: PropertySpec[];
}

export interface Ontology {
	version: string;
	description: string;
	labels: LabelSpec[];
	edges: EdgeSpec[];
}

export interface OntologyStatus {
	exists: boolean;
	version?: string;
	description?: string;
	questions?: string[];
	generatedAt?: string;
	labelCount?: number;
	edgeCount?: number;
}

export interface IngestResult {
	ontologyVersion?: string;
	competenceQuestions?: string[];
	nodeCounts?: Record<string, number>;
	edgeCount?: number;
	vectorized?: Record<string, number>;
	evolved?: boolean;
	source?: 'files' | 'synth';
	agentSummary?: string;
	errors?: string[];
	error?: string;
}

export interface ChannelRow {
	id: string;
	name: string;
}
export interface ClientRow {
	id: string;
	name: string;
	industry: string;
	size: 'SMB' | 'Mid' | 'Enterprise';
	acquiredAt: string;
}
export interface PresenterRow {
	id: string;
	name: string;
	role: string;
	tenureMonths: number;
	tier: 'high' | 'mid' | 'low';
}
export interface PresentationRow {
	id: string;
	title: string;
	deliveredAt: string;
	durationMin: number;
	slidesCount: number;
	template: string;
	medium: 'live' | 'remote' | 'async';
	abstractText: string;
	presenterId: string;
	clientId: string;
}
export interface OutcomeRow {
	id: string;
	result: 'won' | 'lost' | 'no_decision';
	valueUsd: number;
	closedAt: string;
	presentationId: string;
}
export interface CampaignRow {
	id: string;
	name: string;
	channelMix: string[];
	budgetUsd: number;
	startDate: string;
	endDate: string;
	clientId: string;
	ownerId: string;
}
export interface AssetRow {
	id: string;
	kind: 'ad' | 'email' | 'landing' | 'video' | 'social';
	body: string;
	campaignId: string;
	creatorId: string;
}
export interface KpiRow {
	id: string;
	name: string;
	type: 'CTR' | 'ROAS' | 'conversionRate' | 'CPL' | 'reach' | 'engagement';
	value: number;
	capturedAt: string;
	campaignId: string;
}

export interface SeedRows {
	channels: ChannelRow[];
	clients: ClientRow[];
	presenters: PresenterRow[];
	presentations: PresentationRow[];
	outcomes: OutcomeRow[];
	campaigns: CampaignRow[];
	assets: AssetRow[];
	kpis: KpiRow[];
}

export interface GraphNode {
	identity: number;
	labels: string[];
	properties: Record<string, unknown>;
}
export interface GraphRelationship {
	identity: number;
	type: string;
	start: number;
	end: number;
	properties: Record<string, unknown>;
}
export type CypherRow = Record<string, GraphNode | GraphRelationship>;
export interface GraphResult extends Array<CypherRow> {}

export type ViewMode = 'loading' | 'empty' | 'ready';
export type TabId = 'chat' | 'ingestion' | 'graph';