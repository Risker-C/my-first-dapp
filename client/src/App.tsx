import React, { useEffect, useRef, useState } from 'react';
import { Layout, Row, Col, Button,Spin  } from "antd";
import { WalletSelector } from "@aptos-labs/wallet-adapter-ant-design";
import "@aptos-labs/wallet-adapter-ant-design/dist/index.css";
import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";
import { useWallet,InputTransactionData } from "@aptos-labs/wallet-adapter-react"
const aptosConfig = new AptosConfig({ network: Network.DEVNET });
const aptos = new Aptos(aptosConfig);
const moduleAddress = "0xc0910143714a05b5acf337081d3f073fe13803dca207061a46e8a94f10a7b72c";

function App() {
  const walletSelectorRef = useRef()
  const { account, signAndSubmitTransaction } = useWallet();
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [accountHasList, setAccountHasList] = useState<boolean>(false);
  const [transactionInProgress, setTransactionInProgress] = useState<boolean>(false);


  const fetchList = async () => {
    if(!account) return [];
    try {
      const todoListResource = await aptos.getAccountResource({
        accountAddress: account?.address,
        resourceType: `${moduleAddress}::todolist::TodoList`
      });
      setAccountHasList(true)
    } catch (error) {
      setAccountHasList(false)
    }
  }

  const addNewList = async() => {
    if(!account) return [];
    setTransactionInProgress(true);
    const transaction:InputTransactionData = {
      data: {
        function: `${moduleAddress}::todolist::create_list`,
        functionArguments: []
      }
    }
    try {
      const response = await signAndSubmitTransaction(transaction);
      await aptos.waitForTransaction({transactionHash: response.hash});
      setAccountHasList(true)
    } catch (error) {
      setAccountHasList(false);
    } finally {
      setTransactionInProgress(false);
    }
  }

  useEffect(() => {
    fetchList();
  }, [account?.address])

  return (
    <>
      <Layout>
        <Row align="middle">
          <Col span={10} offset={2}>
            <h1>Our todolist</h1>
          </Col>
          <Col span={12} style={{ textAlign: "right", paddingRight: "200px" }}>
            <WalletSelector isModalOpen={isModalOpen}/>
          </Col>
        </Row>
        <Spin spinning={transactionInProgress}>
          {!accountHasList && (<Row gutter={[0, 32]} style={{marginTop: "2rem"}}>
            <Col span={8} offset={8}>
              <Button onClick={addNewList} block type='primary' style={{height: "40px", backgroundColor: "#3f67ff"}}>
                Add new list
              </Button>

            </Col>
          </Row>)}
        </Spin>
      </Layout>
    </>
  );
}

export default App;
