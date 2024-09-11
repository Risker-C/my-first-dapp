import React, { useEffect, useRef, useState } from 'react';
import { Layout, Row, Col, Button,Spin, List, Checkbox, Input  } from "antd";
import { WalletSelector } from "@aptos-labs/wallet-adapter-ant-design";
import "@aptos-labs/wallet-adapter-ant-design/dist/index.css";
import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";
import { useWallet,InputTransactionData } from "@aptos-labs/wallet-adapter-react"
import { CheckboxChangeEvent } from 'antd/es/checkbox';
const aptosConfig = new AptosConfig({ network: Network.DEVNET });
const aptos = new Aptos(aptosConfig);
const moduleAddress = "0xc0910143714a05b5acf337081d3f073fe13803dca207061a46e8a94f10a7b72c";

type Task = {
  address: string;
  completed: boolean;
  content: string;
  task_id: string;
};

type TodoList = {
  tasks: {
    handle: string;
  },
  task_counter: string;
}
function App() {
  const walletSelectorRef = useRef()
  const { account, signAndSubmitTransaction } = useWallet();
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [accountHasList, setAccountHasList] = useState<boolean>(false);
  const [transactionInProgress, setTransactionInProgress] = useState<boolean>(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTask, setNewTask] = useState<string>("");
  const fetchList = async () => {
    if(!account) return [];
    try {
      const todoListResource = await aptos.getAccountResource<TodoList>({
        accountAddress: account?.address,
        resourceType: `${moduleAddress}::todolist::TodoList`
      });
      setAccountHasList(true)
      console.log(todoListResource);
      const tableHandle = todoListResource.tasks.handle;
      const taskCounter = todoListResource.task_counter;

      let tasks = []
      let counter = 1;
      while (counter <= Number(taskCounter)) {
        const tableItem = {
          key_type: 'u64',
          value_type: `${moduleAddress}::todolist::Task`,
          key: `${counter}`
        }
        const task = await aptos.getTableItem<Task>({
          handle: tableHandle,
          data: tableItem
        })
        tasks.push(task)
        counter++;
      }
      setTasks(tasks)
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

  const onWriteTask = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setNewTask(value);
  };

  const onTaskAdded = async () => {
    if(!account) return false;
    setTransactionInProgress(true);
    const transaction: InputTransactionData = {
      data: {
        function: `${moduleAddress}::todolist::create_task`,
        functionArguments: [newTask]
      }
    }
    const taskId = tasks.length > 0 ? parseInt(tasks[tasks.length - 1].task_id) + 1 : 1;
    const newTaskToPush:Task = {
      address: account.address,
      completed: false,
      content: newTask,
      task_id: taskId+''
    }
    try {
      const response = await signAndSubmitTransaction(transaction);
      await aptos.waitForTransaction({transactionHash: response.hash });
      setTasks(origin => [...origin, newTaskToPush])
      setNewTask('')
    } catch (error) {
      console.log(error)
    } finally {
      setTransactionInProgress(false)
    }
  }

  const onCheckboxChange = async (event: CheckboxChangeEvent, taskId: string) => {
    if(!account) return false;
    if(!event.target.checked) return false;
    setTransactionInProgress(true);

    const transaction:InputTransactionData = {
      data: {
        function: `${moduleAddress}::todolist::complete_task`,
        functionArguments: [taskId]
      }
    }

    try {
      const response = await signAndSubmitTransaction(transaction);
      aptos.waitForTransaction({transactionHash: response.hash});
      setTasks(origin => origin.map(item => item.task_id === taskId ? {...item, completed: true} : item))
    } catch (error) {
      console.log(error)
    } finally {
      setTransactionInProgress(false)
    }
  }

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
        {
          !accountHasList ? (
            <Row gutter={[0, 32]} style={{ marginTop: "2rem" }}>
              <Col span={8} offset={8}>
                <Button
                  disabled={!account}
                  block
                  onClick={addNewList}
                  type="primary"
                  style={{ height: "40px", backgroundColor: "#3f67ff" }}
                >
                  Add new list
                </Button>
              </Col>
            </Row>
          ) : (
            <Row gutter={[0, 32]} style={{ marginTop: "2rem" }}>
              <Col span={8} offset={8}>
                <Input.Group compact>
                 <Input
                    onChange={(event) => onWriteTask(event)} // add this
                    style={{ width: "calc(100% - 60px)" }}
                    placeholder="Add a Task"
                    size="large"
                    value={newTask} // add this
                  />
                  <Button
                    onClick={onTaskAdded} // add this
                    type="primary"
                    style={{ height: "40px", backgroundColor: "#3f67ff" }}
                  >
                    Add
                  </Button>
                </Input.Group>
              </Col>
              <Col span={8} offset={8}>
                {tasks && (
                  <List
                    size="small"
                    bordered
                    dataSource={tasks}
                    renderItem={(task) => (
                      <List.Item
                        actions={[
                          <div>
                            {task.completed ? (
                              <Checkbox defaultChecked={true} disabled />
                            ) : (
                              <Checkbox
                                onChange={(event) =>
                                  onCheckboxChange(event, task.task_id)
                                }
                              />
                            )}
                          </div>,
                        ]}
                      >
                        <List.Item.Meta description={
                            <a
                              href={`https://explorer.aptoslabs.com/account/${task.address}/`}
                              target="_blank"
                            >{`${task.content}`}</a>
                          }
                        />
                      </List.Item>
                    )}
                  />
                )}
              </Col>
            </Row>
          )
        }
        </Spin>
      </Layout>
    </>
  );
}

export default App;
