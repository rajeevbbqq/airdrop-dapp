// import Airdrop from "components/Airdrop/Airdrop";
import AirdropSchedules from "components/AirdropSchedule";
import EligibilityBanner from "components/EligibilityBanner";
import type { NextPage } from "next";
import { useTranslation } from "next-i18next";
import nextI18NextConfig from "next-i18next.config";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import Head from "next/head";
import HowItWorks from "snet-ui/HowItWorks";
import Box from "@mui/material/Box";
import Airdroprules from "snet-ui/Airdroprules";
import SubscribeToNotification from "snet-ui/SubscribeToNotification";
import Ecosystem from "snet-ui/Ecosystem";
import CommonLayout from "layout/CommonLayout";
import Registration from "components/Registration";

// import Notqualified from "snet-ui/Noteligible";
import { useEffect, useRef, useState } from "react";
import FAQPage from "snet-ui/FAQ";
import axios from "utils/Axios";
import { API_PATHS } from "utils/constants/ApiPaths";
import { AirdropWindow, findActiveWindow, findFirstUpcomingWindow } from "utils/airdrop_windows";
import { useActiveWeb3React } from "snet-ui/Blockchain/web3Hooks";
import { UserEligibility } from "utils/constants/CustomTypes";
import { Button } from "@mui/material";
import { ethers } from "ethers";
import AirdropContractNetworks from "contract/networks/SingularityAirdrop.json";
import AirdropContractABI from "contract/abi/SingularityAirdrop.json";
import { splitSignature } from "ethers/lib/utils";
import { fromFraction, getGasPrice, parseEthersError } from "utils/ethereum";
import { useAirdropContract } from "utils/AirdropContract";

export const getStaticProps = async ({ locale }) => ({
  props: {
    ...(await serverSideTranslations(locale, ["common"], nextI18NextConfig)),
  },
});

const Home: NextPage = () => {
  const { t } = useTranslation("common");
  const { account, library, chainId } = useActiveWeb3React();
  const rulesRef = useRef<HTMLDivElement>(null);
  const scheduleRef = useRef<HTMLDivElement>(null);
  const [schedules, setSchedules] = useState<any[] | undefined>(undefined);
  const [activeWindow, setActiveWindow] = useState<AirdropWindow | undefined>(undefined);
  const [userEligibility, setUserEligibility] = useState<UserEligibility>(UserEligibility.PENDING);
  const airdropContract = useAirdropContract(AirdropContractNetworks[chainId ?? 0]?.address);
  const [claimHistory, setClaimHistory] = useState([]);

  useEffect(() => {
    getAirdropSchedule();
  }, []);

  useEffect(() => {
    getUserEligibility();
    getClaimHistory();
  }, [activeWindow, account]);

  const getAirdropSchedule = async () => {
    try {
      const tokenName = "AGIX";
      const data: any = await axios.get(`${API_PATHS.AIRDROP_SCHEDULE}/${tokenName}`);
      const airdrop = data.data.data;
      const airdropTimelines = airdrop.airdrop_windows.map((el) => el.airdrop_window_timeline);

      const airdropSchedules = airdropTimelines.flat().map((timeline) => ({
        time: new Date(timeline.airdrop_window_timeline_date),
        title: timeline.airdrop_window_timeline_info,
        description: timeline.airdrop_window_timeline_description,
      }));

      let activeWindow = findActiveWindow(airdrop.airdrop_windows);
      if (!activeWindow) {
        activeWindow = findFirstUpcomingWindow(airdrop.airdrop_windows);
      }
      setActiveWindow(activeWindow);
      setSchedules(airdropSchedules);
    } catch (e) {
      console.log("schedule error", e);
      // TODO: Implement error handling
    }
  };

  const getClaimHistory = async () => {
    if (
      typeof activeWindow?.airdrop_id === "undefined" ||
      typeof activeWindow?.airdrop_window_id === "undefined" ||
      !account
    )
      return;
    const response: any = await axios.post(API_PATHS.CLAIM_HISTORY, {
      address: account,
      airdrop_id: `${activeWindow.airdrop_id}`,
      airdrop_window_id: `${activeWindow.airdrop_window_id}`,
    });
    console.log("response.data", response.data.data.claim_history);
  };

  const handleScrollToRules = () => {
    if (rulesRef) {
      rulesRef?.current?.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleScrollToSchedule = () => {
    if (scheduleRef) {
      scheduleRef?.current?.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleClaim = async () => {
    if (
      typeof activeWindow?.airdrop_id === "undefined" ||
      typeof activeWindow?.airdrop_window_id === "undefined" ||
      !account ||
      !library ||
      !chainId
    )
      return;

    const getClaimDetails = async () => {
      const response: any = await axios.post(API_PATHS.CLAIM_SIGNATURE, {
        address: account,
        airdrop_id: `${activeWindow.airdrop_id}`,
        airdrop_window_id: `${activeWindow.airdrop_window_id}`,
      });

      console.log("response", response);
      return response.data.data;
    };

    const executeClaimMethod = async (signature: string, claimAmount: number) => {
      try {
        // TODO: Don't hardcode it, use it from the API or env
        // const tokenAddress = "0xa1e841e8f770e5c9507e2f8cfd0aa6f73009715d"; // AGIX
        const tokenAddress = "0x5e94577b949a56279637ff74dfcff2c28408f049"; // SDAO

        const txn = await airdropContract.claim(
          tokenAddress,
          claimAmount.toString(),
          activeWindow.airdrop_id.toString(),
          activeWindow.airdrop_window_id.toString(),
          signature
        );
        return txn;
      } catch (error: any) {
        console.log("errrrrrrr", error);
        const ethersError = parseEthersError(error);
        if (ethersError) {
          alert(ethersError);
        }
      }
    };

    const saveClaimTxn = async (txnHash: string, claimAmount) => {
      const response = await axios.post(API_PATHS.CLAIM_SAVE_TXN, {
        address: account,
        txn_hash: txnHash,
        amount: claimAmount.toString(),
        airdrop_id: `${activeWindow.airdrop_id}`,
        airdrop_window_id: `${activeWindow.airdrop_window_id}`,
        txn_status: "PENDING",
      });
      console.log("response.dat", response.data);
    };

    // Retreiving Claim Signature from the backend signer service
    const claimDetails = await getClaimDetails();

    // Using the claim signature and calling the Ethereum Airdrop Contract.

    const txn = await executeClaimMethod(claimDetails.signature, claimDetails.claimable_amount);

    await saveClaimTxn(
      // Temporary value for testing
      txn?.hash ?? "0x54990b02618bb025e91f66bd253baa77522aff4b0140440f5aecdd463c24b2fc",
      claimDetails.claimable_amount
    );
    const receipt = await txn?.wait();
    console.log("receipt", receipt);
  };

  const getUserEligibility = async () => {
    try {
      if (
        typeof activeWindow?.airdrop_id === "undefined" ||
        typeof activeWindow?.airdrop_window_id === "undefined" ||
        !account
      )
        return;
      const payload: any = {
        signature: "",
        address: account,
        airdrop_id: activeWindow.airdrop_id,
        airdrop_window_id: activeWindow.airdrop_window_id,
      };
      const response = await axios.post(API_PATHS.AIRDROP_USER_ELIGIBILITY, payload);
      const isEligible = response.data.data.is_eligible;
      setUserEligibility(isEligible ? UserEligibility.ELIGIBLE : UserEligibility.NOT_ELIGIBLE);
    } catch (error: any) {
      console.log("eligibility check error");
    }
  };

  return (
    <CommonLayout>
      <Head>
        <title>Airdrop</title>
      </Head>
      <Box px={[0, 4]} mt={3}>
        <Button onClick={handleClaim} variant="contained" color="secondary">
          Temporary Claim
        </Button>
        <EligibilityBanner userEligibility={userEligibility} onViewRules={handleScrollToRules} />
      </Box>
      <Registration
        userEligibility={userEligibility}
        onViewRules={handleScrollToRules}
        onViewSchedule={handleScrollToSchedule}
        airdropId={activeWindow?.airdrop_id}
        airdropWindowId={activeWindow?.airdrop_window_id}
      />
      <HowItWorks title="How Airdrop Works" steps={HowItWorksSampleData} blogLink="www.google.com" />
      <SubscribeToNotification />
      <Airdroprules title="Airdrop Rules" steps={RulesSampleData} blogLink="www.google.com" ref={rulesRef} />
      <AirdropSchedules ref={scheduleRef} schedules={schedules} />
      <Ecosystem blogLink="www.google.com" />

      <FAQPage />
    </CommonLayout>
  );
};

export default Home;

const HowItWorksSampleData = [
  {
    title: "Lorem Ipsum is simply dummy text of the printing an",
    description:
      "typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised",
  },
  {
    title: "It is a long established fact that a",
    description:
      " is that it has a more-or-less normal distribution of letters, as opposed to using 'Content here, content here', making it look like readable English. Many desktop publishing packages and web page editors now use Lorem Ipsum as their default model text, and a search for 'lorem ipsum' will uncover many web sites still in their infancy. Various versions ",
  },
  {
    title: "Contrary to popular belief, Lorem Ipsum is not si",
    description:
      "andom text. It has roots in a piece of classical Latin literature from 45 BC, making it over 2000 years old. Richard McClintock, a Latin professor at Hampden-Sydney College in Virginia, looked up one of the more obscure Latin words, consectetur, from a Lorem Ipsum passage, and going through the cites of the word in classical literature, discovered the undoubtable source. Lorem I",
  },
  {
    title: "Where can I get some?",
    description:
      "There are many variations of passages of Lorem Ipsum available, but the majority have suffered alteration in some form, by injected humour, or randomised words which don't look even slightly believable. If you are going to use a passage of Lorem Ipsum, you need to be sure there isn't anything embarrassing hidden in the middle of text. All the Lorem Ipsum generat",
  },
  {
    title: "atise on the theory of ethics, very popu",
    description:
      "ontrary to popular belief, Lorem Ipsum is not simply random text. It has roots in a piece of classical Latin literature from 45 BC, making it over 2000 years old. Richard McClintock, a Latin professor at Hampden-Sydney College in Virginia, looked up one of the more obscure Latin words, c",
  },
  {
    title: "atise Ipsum is simply dummy text of the printing an",
    description:
      "there are many variations in the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised",
  },
];

const RulesSampleData = [
  {
    title: "Early Deposits Get Better Rewards",
    description:
      "typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised",
  },
  {
    title: "First Come,First Served",
    description:
      " is that it has a more-or-less normal distribution of letters, as opposed to using 'Content here, content here', making it look like readable English. Many desktop publishing packages and web page editors now use Lorem Ipsum as their default model text, and a search for 'lorem ipsum' will uncover many web sites still in their infancy. Various versions ",
  },
  {
    title: "Deposit the Featured Crypto",
    description:
      "andom text. It has roots in a piece of classical Latin literature from 45 BC, making it over 2000 years old. Richard McClintock, a Latin professor at Hampden-Sydney College in Virginia, looked up one of the more obscure Latin words, consectetur, from a Lorem Ipsum passage, and going through the cites of the word in classical literature, discovered the undoubtable source. Lorem I",
  },
  {
    title: "Minimum Token Balance To Maintain",
    description:
      "There are many variations of passages of Lorem Ipsum available, but the majority have suffered alteration in some form, by injected humour, or randomised words which don't look even slightly believable. If you are going to use a passage of Lorem Ipsum, you need to be sure there isn't anything embarrassing hidden in the middle of text. All the Lorem Ipsum generat",
  },
];
