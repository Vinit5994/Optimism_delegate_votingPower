import Image from "next/image";
import  Delegates  from "./component/Delegates";
import Proposals from "./component/Proposal";
import VotesComponent from "./component/SpecificProposal";
import CanceledProposals from "./component/Cancelproposal";

export default function Home() {
  return (
   <>
   <Delegates/>
   {/* <Proposals/> */}
   {/* <VotesComponent proposalId={"88658655411314992983575523105180250509368629063896834751261516507794732971264"}/> */}
   {/* <CanceledProposals/> */}
   </>
  );
}
