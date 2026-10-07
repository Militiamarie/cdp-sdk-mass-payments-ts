import { cdpClient } from '@/lib/cdp';
import { TransferParams, TransferResult } from '@/lib/types/transfer';
import { getTokenAddresses, TokenKey } from '@/lib/constants';
import GasliteDrop from '@/contracts/GasliteDrop.json';
import { encodeFunctionData } from 'viem';
import { randomUUID } from 'crypto';
import { publicClient } from '@/lib/viem';
import { getNetworkConfig } from '@/lib/network';

const { network } = getNetworkConfig();

export async function executeTransfers(
  params: TransferParams
): Promise<TransferResult> {
  const { senderAccount, token, addresses, amounts, totalAmount } = params;

  console.log(
    'Executing batch transfer:',
    senderAccount.address,
    token,
    addresses,
    amounts,
    totalAmount
  );

  try {
    const contractAddress = process.env.GASLITE_DROP_ADDRESS;
    const tokenAddresses = getTokenAddresses(network === 'base');
    const functionName = token === 'eth' ? 'airdropETH' : 'airdropERC20';
    const args =
      token === 'eth'
        ? [addresses, amounts]
        : [tokenAddresses[token as TokenKey], addresses, amounts, totalAmount];

    const result = await cdpClient.evm.sendTransaction({
      address: senderAccount.address as `0x${string}`,
      transaction: {
        to: contractAddress as `0x${string}`,
        data: encodeFunctionData({
          abi: GasliteDrop,
          functionName,
          args,
        }),
        value: token === 'eth' ? BigInt(totalAmount) : BigInt(0),
        type: 'eip1559',
      },
      network,
      idempotencyKey: randomUUID(),
    });

    const transactionHash = result.transactionHash;

    await publicClient.waitForTransactionReceipt({
      hash: transactionHash as `0x${string}`,
    });

    return {
      success: true,
      hash: transactionHash,
    };
  } catch (error) {
    console.error('Error executing batch transfer:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
