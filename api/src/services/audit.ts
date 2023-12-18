import * as fcl from "@onflow/fcl";

type AuditManagerData = {
    uuid: string;
    audits: Record<string, true>;
}

export class AuditService {

    public async getAuditsByAuditorAddress(address: string, network: string) {
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

    public async getAuditsByTemplateId(templateId: string, network: string) {

    }

    private getAccessNodeApiForNetwork(network: string) {
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
