import {
    AIFunction,
    AIObject,
    registerFunctionIntoAI,
} from "@sashimo/lib"
import { proposalEngine } from "./proposal-engine.js"
import type { ProposalInput, ProposalOutput } from "./proposal.js"

// Mock function for demo purposes - replace with actual user service
function getUserById(userId: number) {
    return {
        email: `user${userId}@example.com`
    }
}

const UserObject = new AIObject("User", "a user in the system", true).field({
    name: "email",
    description: "the email of the user",
    type: "string",
    required: true,
})

const GetUserByIdFunction = new AIFunction("get_user_by_id", "get a user by id")
    .args({
        name: "userId",
        description: "a user's id",
        type: "number",
        required: true,
    })
    .returns(UserObject)
    .implement((userId: number) => {
        const user = getUserById(userId)
        return user
    })

registerFunctionIntoAI("get_user_by_id", GetUserByIdFunction)

// ── Proposal Engine AI Function ──────────────────────────────────────

const ProcessProposalFunction = new AIFunction("process_proposal", "Process a cooperative proposal through the AI-powered multi-agent proposal engine. The AI will analyze the raw text and extract/infer all structured fields including title, description, region, category, budget, etc.")
    .args({
        name: "proposalText",
        description: "Raw text describing the proposal. Can be any format - the AI will extract the title, description, and all other relevant details from this text.",
        type: "string",
        required: true,
    })
    .returns(new AIObject("ProposalResult", "processed proposal result", true))
    .implement(async (
        proposalText: string
    ): Promise<ProposalOutput> => {
        // Create minimal proposal input - AI will extract and infer everything
        const proposalInput: ProposalInput = {
            text: proposalText, // Raw text for AI to analyze and extract all fields from
            // All fields are optional and will be inferred/extracted by the proposal engine
            proposer: undefined,
            region: undefined,
        }
        
        return await proposalEngine.processProposal(proposalInput)
    })

registerFunctionIntoAI("process_proposal", ProcessProposalFunction)