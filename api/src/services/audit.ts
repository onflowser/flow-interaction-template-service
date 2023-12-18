import * as fcl from "@onflow/fcl";

type AuditManagerData = {
    uuid: string;
    audits: Record<string, true>;
}

type FlowNetwork = string;

type Auditor = {
    f_type: "FlowInteractionTemplateAuditor";
    f_version: string;
    address: string;
    name: string;
    twitter_url: string;
    website_url: string;
}

type AuditorsJSON = Record<FlowNetwork, Auditor[] | undefined>

export class AuditService {

    constructor(private readonly auditorsJSON: AuditorsJSON) {}

    public async getAuditorsByNetwork(network: FlowNetwork) {
        return this.auditorsJSON[network];
    }

    public async getAuditedTemplateIdsByAuditor(address: string, network: FlowNetwork) {
        const accessNodeApi = this.getAccessNodeApiForNetwork(network);

        if (!accessNodeApi) {
            throw new Error(`Network '${network}' not supported`)
        }

        fcl.config().put("accessNode.api", accessNodeApi);

        const response: AuditManagerData | null = await fcl.query({
            cadence: `
                pub fun main(address: Address): &AnyResource? {
                  let account = getAuthAccount(address)
                  return account.borrow<&AnyResource>(from: /storage/FlowInteractionTemplateAuditManagerStoragePath)
                }
            `,
            args: (arg, t) => [
                arg(address, t.Address)
            ]
        });

        if (response === null) {
            // No audits resource found = no audits for this address.
            return [];
        }

        return Object.entries(response.audits)
            .filter((entry) => entry[1])
            .map(entry => entry[0]);
    }

    public async getAuditorsByTemplateId(templateId: string, network: FlowNetwork) {
        const auditors = await this.getAuditorsByNetwork(network);

        if (auditors === undefined) {
            return [];
        }

        const auditorsWithAudits = await Promise.all(
            auditors.map(async auditor => {
                const audits = await this.getAuditedTemplateIdsByAuditor(auditor.address, network);
                return {
                    auditor,
                    audits
                }
            })
        );

        return auditorsWithAudits
            .filter(entry => entry.audits.some(auditedTemplateId => auditedTemplateId === templateId))
            .map(entry => entry.auditor);
    }

    private getAccessNodeApiForNetwork(network: FlowNetwork) {
        switch (network) {
            case "testnet":
                return "https://rest-testnet.onflow.org";
            case "mainnet":
                return "https://rest-mainnet.onflow.org"
            default:
                return undefined;
        }
    }
}
